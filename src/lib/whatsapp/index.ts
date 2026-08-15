import { formatRupiah } from '@/lib/utils';
import { TIER_LABELS } from '@/types';
import type { OrderRecord, SettingsRecord } from '@/types';

export const PURCHASE_WARNING =
  'Pastikan konfigurasi Anda sudah benar sebelum melakukan pembayaran. Pembelian bersifat final sesuai kebijakan WangStore. Jika ragu, konsultasikan terlebih dahulu.';

export const ORDER_AGREEMENT =
  'Saya menyetujui Syarat & Ketentuan, Kebijakan Refund, dan SLA WangStore, serta memahami bahwa pembelian bersifat final.';

/**
 * Membangun URL WhatsApp untuk order.
 * Nomor tujuan berasal dari pengaturan admin (settings.whatsappNumber).
 * Jika nomor belum dikonfigurasi, mengembalikan null — UI menampilkan
 * status jujur, bukan tombol palsu.
 */
export function buildWhatsAppOrderUrl(
  order: OrderRecord,
  settings: SettingsRecord,
  appUrl: string,
): string | null {
  const number = settings.whatsappNumber.trim();
  if (!number) return null;

  const lines = [
    '*PESANAN BARU — WangStore*',
    '',
    `Order ID: ${order.id}`,
    `Nama: ${order.customerName}`,
    `WhatsApp: ${order.customerWhatsapp}`,
    `Email: ${order.customerEmail}`,
    `Nama Server: ${order.serverName}`,
    '',
    `Tier: ${TIER_LABELS[order.tier]}${order.packageId ? ` — ${order.packageId}` : ''}`,
    `CPU: ${order.cpu} vCore`,
    `RAM: ${order.ramGb} GB`,
    `Penyimpanan: ${order.storageGb} GB`,
    '',
    `Harga: ${formatRupiah(order.unitPrice)}/bulan`,
    order.couponCode ? `Kupon: ${order.couponCode} (potongan ${formatRupiah(order.discountAmount)})` : 'Kupon: —',
    `Total: ${formatRupiah(order.total)}`,
    '',
    `Konfirmasi order: ${appUrl}/order/${order.id}`,
    '',
    `Saya menyetujui Syarat & Ketentuan, Kebijakan Refund, dan SLA WangStore, serta memahami bahwa pembelian bersifat final.`,
  ];

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${number}?text=${text}`;
}

/** Ringkasan order untuk fallback WhatsApp di sisi klien (bukan order resmi). */
export function buildClientOrderSummary(input: {
  tier: string;
  packageId: string | null;
  cpu: number;
  ramGb: number;
  storageGb: number;
  price: number;
  total: number;
  couponCode: string | null;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
  serverName: string;
}): string {
  const lines = [
    '*RINGKASAN KONFIGURASI — WangStore*',
    '',
    `Nama: ${input.customerName}`,
    `WhatsApp: ${input.customerWhatsapp}`,
    `Email: ${input.customerEmail}`,
    `Nama Server: ${input.serverName}`,
    '',
    `Tier: ${input.tier}${input.packageId ? ` — ${input.packageId}` : ''}`,
    `CPU: ${input.cpu} vCore`,
    `RAM: ${input.ramGb} GB`,
    `Penyimpanan: ${input.storageGb} GB`,
    '',
    `Estimasi harga: ${formatRupiah(input.price)}/bulan`,
    input.couponCode ? `Kupon: ${input.couponCode}` : 'Kupon: —',
    `Estimasi total: ${formatRupiah(input.total)}`,
    '',
    'Catatan: ini ringkasan sementara, bukan order resmi. Order resmi dibuat setelah sistem memverifikasi dan menyimpan pesanan Anda.',
  ];
  return encodeURIComponent(lines.join('\n'));
}

export function waLinkForNumber(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
