import type { OrderStatus } from '@/types';

/**
 * Arsitektur pembayaran modular.
 *
 * Provider:
 * - "manual": pembayaran diverifikasi manual oleh tim (default, selalu
 *   tersedia). Tidak ada pembayaran "sukses palsu".
 * - "payment-gateway": titik ekstensi untuk gateway pembayaran.
 *   Jika provider gateway dikonfigurasi tetapi kredensialnya belum ada,
 *   status dilaporkan jujur (configured: false) dan order tetap memakai
 *   alur manual.
 */

export type PaymentMethod = 'manual' | 'payment-gateway';

export interface PaymentProviderStatus {
  provider: PaymentMethod;
  configured: boolean;
  label: string;
  note: string;
}

export interface PaymentContext {
  orderId: string;
  amount: number;
  customerEmail: string;
  customerName: string;
}

export interface PaymentProvider {
  readonly id: PaymentMethod;
  status(): Promise<PaymentProviderStatus>;
  /** Membuat instruksi pembayaran. Provider manual mengembalikan instruksi dari settings. */
  createPayment(context: PaymentContext): Promise<{ ok: boolean; instructions: string; error?: string }>;
}

class ManualPaymentProvider implements PaymentProvider {
  readonly id = 'manual' as const;

  async status(): Promise<PaymentProviderStatus> {
    return {
      provider: 'manual',
      configured: true,
      label: 'Pembayaran Manual (konfirmasi admin)',
      note: 'Pembayaran diverifikasi oleh tim WangStore melalui kanal resmi.',
    };
  }

  async createPayment(context: PaymentContext): Promise<{ ok: boolean; instructions: string; error?: string }> {
    void context;
    return {
      ok: true,
      instructions:
        'Pembayaran dilakukan secara manual melalui konfirmasi admin. Tim WangStore akan menghubungi Anda melalui WhatsApp untuk detail pembayaran dan aktivasi layanan.',
    };
  }
}

class GatewayPaymentProvider implements PaymentProvider {
  readonly id = 'payment-gateway' as const;

  async status(): Promise<PaymentProviderStatus> {
    const configured = Boolean(process.env.PAYMENT_GATEWAY_API_KEY);
    return {
      provider: 'payment-gateway',
      configured,
      label: configured ? 'Payment Gateway' : 'Payment Gateway (belum dikonfigurasi)',
      note: configured
        ? 'Gateway pembayaran aktif.'
        : 'Gateway pembayaran belum dikonfigurasi. Order diproses melalui pembayaran manual.',
    };
  }

  async createPayment(_context: PaymentContext): Promise<{ ok: boolean; instructions: string; error?: string }> {
    return {
      ok: false,
      instructions: '',
      error: 'Gateway pembayaran belum dikonfigurasi. Gunakan pembayaran manual.',
    };
  }
}

export function getPaymentProvider(provider: PaymentMethod = 'manual'): PaymentProvider {
  if (provider === 'payment-gateway') return new GatewayPaymentProvider();
  return new ManualPaymentProvider();
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'awaiting_payment',
  'paid',
  'processing',
  'completed',
  'cancelled',
  'expired',
  'refunded',
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  const terminal: OrderStatus[] = ['completed', 'cancelled', 'expired', 'refunded'];
  if (terminal.includes(from)) return false;
  // Batalkan/kedaluwarsa hanya dari status sebelum pembayaran diverifikasi.
  if ((to === 'cancelled' || to === 'expired') && ['paid', 'processing', 'completed'].includes(from)) {
    return to === 'cancelled' && from === 'processing';
  }
  return true;
}
