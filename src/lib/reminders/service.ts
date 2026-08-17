import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { formatDateTime, formatRupiah } from '@/lib/utils';
import { orderCatalogLabel } from '@/lib/catalog';
import { nextReminder, reminderStageLabel } from '@/lib/reminders';
import type { OrderRecord } from '@/types';

/**
 * Pengiriman pengingat masa aktif layanan.
 *
 * Dipanggil oleh scheduler platform (mis. Vercel Cron → /api/cron/reminders)
 * atau secara manual oleh admin. Tidak ada proses long-running di aplikasi —
 * sesuai batasan arsitektur serverless.
 *
 * Idempoten: setiap tahap pengingat ditandai pada order setelah terkirim,
 * sehingga menjalankan cron dua kali dalam sehari tidak menghasilkan pesan ganda.
 */

export interface ReminderResult {
  orderId: string;
  stage: number;
  notified: boolean;
  emailSent: boolean;
  emailError: string | null;
}

export interface ReminderRunSummary {
  checked: number;
  sent: number;
  results: ReminderResult[];
  /** Diisi bila pengiriman email gagal untuk sebagian order. */
  failures: number;
}

function reminderSubject(order: OrderRecord, stage: number): string {
  return stage <= 0
    ? `Masa aktif layanan ${order.serverName} berakhir hari ini`
    : `Pengingat: masa aktif ${order.serverName} berakhir dalam ${stage} hari`;
}

function reminderBody(order: OrderRecord, stage: number, appUrl: string): string {
  const lines = [
    `Halo ${order.customerName},`,
    '',
    stage <= 0
      ? `Masa aktif layanan Anda berakhir hari ini (${formatDateTime(order.expiresAt)}).`
      : `Masa aktif layanan Anda akan berakhir dalam ${stage} hari, pada ${formatDateTime(order.expiresAt)}.`,
    '',
    `Order ID   : ${order.id}`,
    `Layanan    : ${orderCatalogLabel(order)}${order.packageId ? ` — ${order.packageId}` : ''}`,
    `Nama server: ${order.serverName}`,
    `Aktif sejak: ${order.activatedAt ? formatDateTime(order.activatedAt) : 'belum dicatat'}`,
    `Berlaku s/d: ${formatDateTime(order.expiresAt)}`,
    `Biaya      : ${formatRupiah(order.total)}/bulan`,
    '',
    // Tautan hanya dicantumkan bila URL aplikasi dikonfigurasi — tidak
    // mengirim tautan setengah jadi kepada pelanggan.
    ...(appUrl ? [`Detail order: ${appUrl}/order/${order.id}`, ''] : []),
    'Untuk memperpanjang layanan, balas email ini atau hubungi tim WangStore melalui kanal dukungan.',
    'Perpanjangan diproses manual oleh tim kami — layanan tidak diperpanjang otomatis.',
  ];
  return lines.join('\n');
}

/**
 * Menjalankan satu putaran pengingat.
 * @param options.now Waktu acuan (untuk pengujian).
 * @param options.limit Batas order yang diproses dalam satu putaran.
 */
export async function runReminders(options?: {
  now?: Date;
  limit?: number;
  appUrl?: string;
}): Promise<ReminderRunSummary> {
  const now = options?.now ?? new Date();
  const limit = options?.limit ?? 200;
  const appUrl = options?.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

  const db = await getDb();
  const orders = await db.orders.listWithExpiry({ limit });

  const results: ReminderResult[] = [];
  let failures = 0;

  for (const order of orders) {
    const due = nextReminder(order, now);
    if (!due) continue;

    // Notifikasi dashboard (hanya untuk order yang terhubung ke akun).
    let notified = false;
    if (order.userId) {
      await db.notifications.create({
        userId: order.userId,
        type: 'service_expiry',
        title: reminderStageLabel(due.stage),
        message: `Layanan ${order.serverName} (order ${order.id}) berlaku sampai ${formatDateTime(order.expiresAt)}.`,
        read: false,
      });
      notified = true;
    }

    // Email ke alamat pemesan — status pengiriman dilaporkan apa adanya.
    const email = await sendEmail({
      to: order.customerEmail,
      subject: reminderSubject(order, due.stage),
      text: reminderBody(order, due.stage, appUrl),
    });
    if (!email.sent) failures += 1;

    const sentAt = now.toISOString();
    await db.orders.markReminderSent(order.id, due.stage, sentAt);
    // Tahap yang terlewat ditandai agar tidak dikirim menyusul secara beruntun.
    for (const stage of due.alsoMark) {
      await db.orders.markReminderSent(order.id, stage, sentAt);
    }

    await db.audit.log({
      actorId: null,
      actorEmail: 'system',
      action: 'service_reminder',
      resource: 'order',
      resourceId: order.id,
      ipAddress: null,
      metadata: {
        stage: due.stage,
        expiresAt: order.expiresAt,
        emailSent: email.sent,
        emailProvider: email.provider,
        ...(email.error ? { emailError: email.error } : {}),
      },
    });

    results.push({
      orderId: order.id,
      stage: due.stage,
      notified,
      emailSent: email.sent,
      emailError: email.error,
    });
  }

  return { checked: orders.length, sent: results.length, results, failures };
}
