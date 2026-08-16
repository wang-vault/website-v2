import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { generateId } from '@/lib/utils';
import { orderCatalogKey } from '@/lib/catalog';
import type {
  AnnouncementRecord,
  AuditLogRecord,
  BlogCategoryRecord,
  BlogPostRecord,
  CouponRecord,
  FaqItemRecord,
  IncidentRecord,
  KnowledgeArticleRecord,
  LegalDocumentRecord,
  MaintenanceWindowRecord,
  NotificationRecord,
  OrderRecord,
  PackageRecord,
  VpsPackageRecord,
  CmsPageRecord,
  PricingRulesRecord,
  ProductRecord,
  ProfileRecord,
  SavedConfigurationRecord,
  SettingsRecord,
  TestimonialRecord,
  TicketMessageRecord,
  TicketRecord,
  UserRecord,
} from '@/types';
import type {
  AnnouncementRepository,
  AuditRepository,
  BlogRepository,
  CouponRepository,
  CmsPageRepository,
  DataStore,
  FaqRepository,
  IncidentRepository,
  KnowledgeBaseRepository,
  LegalRepository,
  MaintenanceRepository,
  NotificationRepository,
  OrderRepository,
  PackageRepository,
  VpsPackageRepository,
  Paginated,
  PricingRepository,
  ProductRepository,
  ProfileRepository,
  RateLimitRepository,
  SavedConfigurationRepository,
  SettingsRepository,
  TestimonialRepository,
  TicketRepository,
  UserRepository,
} from './types';

/**
 * DataStore production berbasis Supabase PostgreSQL.
 *
 * - Kolom tabel memakai nama camelCase (quoted identifier) agar pemetaan
 *   objek 1:1 dengan lapisan domain; lihat database/schema.sql.
 * - Operasi multi-tulis (order, tiket) memakai fungsi SQL transaksional
 *   (rpc_create_order, rpc_create_ticket) sehingga rollback otomatis.
 * - Koneksi memakai service role key di sisi server SAJA. Key ini tidak
 *   pernah dikirim ke browser. RBAC diverifikasi di lapisan API.
 */

const ORDER_TABLE = 'orders';
const USER_TABLE = 'users';

function orderBy(p: { page: number; pageSize: number }): { from: number; to: number } {
  const page = Math.max(1, Math.floor(p.page));
  const pageSize = Math.max(1, Math.floor(p.pageSize));
  return { from: (page - 1) * pageSize, to: page * pageSize - 1 };
}

export class SupabaseDataStore implements DataStore {
  readonly driver = 'supabase' as const;

  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private async getMany<T>(table: string, query: { from: number; to: number }, filter?: (q: never) => never): Promise<T[]> {
    // Filter per-tabel diterapkan langsung di metode repo masing-masing;
    // di sini hanya batas rentang.
    void filter;
    const { data, error } = await this.client.from(table).select('*').range(query.from, query.to);
    if (error) throw new Error(`Supabase select ${table}: ${error.message}`);
    return (data ?? []) as T[];
  }

  // ───────────────────────────────────────────── users & profiles
  readonly users: UserRepository = {
    findByEmail: async (email: string) => {
      const { data, error } = await this.client
        .from(USER_TABLE)
        .select('*')
        .ilike('email', email.trim())
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`Supabase users.findByEmail: ${error.message}`);
      return (data as UserRecord | null) ?? null;
    },
    findByResetToken: async (token: string) => {
      const { data, error } = await this.client
        .from(USER_TABLE)
        .select('*')
        .eq('resetToken', token)
        .maybeSingle();
      if (error) throw new Error(`Supabase users.findByResetToken: ${error.message}`);
      return (data as UserRecord | null) ?? null;
    },
    findByVerificationToken: async (token: string) => {
      const { data, error } = await this.client
        .from(USER_TABLE)
        .select('*')
        .eq('emailVerificationToken', token)
        .maybeSingle();
      if (error) throw new Error(`Supabase users.findByVerificationToken: ${error.message}`);
      return (data as UserRecord | null) ?? null;
    },
    findById: async (id: string) => {
      const { data, error } = await this.client.from(USER_TABLE).select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`Supabase users.findById: ${error.message}`);
      return (data as UserRecord | null) ?? null;
    },
    create: async (user: UserRecord) => {
      const { error } = await this.client.from(USER_TABLE).insert(user);
      if (error) throw new Error(`Supabase users.create: ${error.message}`);
    },
    update: async (id: string, patch: Partial<UserRecord>) => {
      const { data, error } = await this.client
        .from(USER_TABLE)
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(`Supabase users.update: ${error.message}`);
      return (data as UserRecord | null) ?? null;
    },
    list: async (input) => {
      const { from, to } = orderBy(input);
      let query = this.client.from(USER_TABLE).select('*', { count: 'exact' });
      if (input.search) query = query.ilike('email', `%${input.search}%`);
      if (input.role) query = query.eq('role', input.role);
      const { data, count, error } = await query.order('createdAt', { ascending: false }).range(from, to);
      if (error) throw new Error(`Supabase users.list: ${error.message}`);
      const paginated: Paginated<UserRecord> = {
        items: (data ?? []) as UserRecord[],
        total: count ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
      return paginated;
    },
    count: async () => {
      const { count, error } = await this.client.from(USER_TABLE).select('*', { count: 'exact', head: true });
      if (error) throw new Error(`Supabase users.count: ${error.message}`);
      return count ?? 0;
    },
  };

  readonly profiles: ProfileRepository = {
    get: async (userId: string) => {
      const { data, error } = await this.client.from('profiles').select('*').eq('userId', userId).maybeSingle();
      if (error) throw new Error(`Supabase profiles.get: ${error.message}`);
      return (data as ProfileRecord | null) ?? null;
    },
    upsert: async (profile: ProfileRecord) => {
      const { error } = await this.client.from('profiles').upsert(profile, { onConflict: 'userId' });
      if (error) throw new Error(`Supabase profiles.upsert: ${error.message}`);
    },
  };

  // ───────────────────────────────────────────── products & packages
  readonly products: ProductRepository = {
    list: async (input: { publicOnly: boolean }) => {
      let query = this.client.from('products').select('*');
      if (input.publicOnly) query = query.eq('status', 'active').eq('visibility', 'public');
      const { data, error } = await query.order('sortOrder', { ascending: true });
      if (error) throw new Error(`Supabase products.list: ${error.message}`);
      return (data ?? []) as ProductRecord[];
    },
    getBySlug: async (slug: string) => {
      const { data, error } = await this.client.from('products').select('*').eq('slug', slug).maybeSingle();
      if (error) throw new Error(`Supabase products.getBySlug: ${error.message}`);
      return (data as ProductRecord | null) ?? null;
    },
    create: async (product: ProductRecord) => {
      const { error } = await this.client.from('products').insert(product);
      if (error) throw new Error(`Supabase products.create: ${error.message}`);
    },
    update: async (id: string, patch: Partial<ProductRecord>) => {
      const { data, error } = await this.client
        .from('products')
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(`Supabase products.update: ${error.message}`);
      return (data as ProductRecord | null) ?? null;
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('products').delete().eq('id', id);
      if (error) throw new Error(`Supabase products.remove: ${error.message}`);
    },
  };

  readonly packages: PackageRepository = {
    list: async () => {
      const { data, error } = await this.client.from('packages').select('*').order('sortOrder', { ascending: true });
      if (error) throw new Error(`Supabase packages.list: ${error.message}`);
      return (data ?? []) as PackageRecord[];
    },
    get: async (id: string) => {
      const { data, error } = await this.client.from('packages').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`Supabase packages.get: ${error.message}`);
      return (data as PackageRecord | null) ?? null;
    },
    upsert: async (pkg: PackageRecord) => {
      const { error } = await this.client.from('packages').upsert(pkg, { onConflict: 'id' });
      if (error) throw new Error(`Supabase packages.upsert: ${error.message}`);
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('packages').delete().eq('id', id);
      if (error) throw new Error(`Supabase packages.remove: ${error.message}`);
    },
  };

  // ───────────────────────────────────────────── paket VPS
  readonly vpsPackages: VpsPackageRepository = {
    list: async () => {
      const { data, error } = await this.client.from('vps_packages').select('*').order('sortOrder', { ascending: true });
      if (error) throw new Error(`Supabase vpsPackages.list: ${error.message}`);
      return (data ?? []) as VpsPackageRecord[];
    },
    get: async (id: string) => {
      const { data, error } = await this.client.from('vps_packages').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`Supabase vpsPackages.get: ${error.message}`);
      return (data as VpsPackageRecord | null) ?? null;
    },
    upsert: async (pkg: VpsPackageRecord) => {
      const { error } = await this.client.from('vps_packages').upsert(pkg, { onConflict: 'id' });
      if (error) throw new Error(`Supabase vpsPackages.upsert: ${error.message}`);
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('vps_packages').delete().eq('id', id);
      if (error) throw new Error(`Supabase vpsPackages.remove: ${error.message}`);
    },
  };

  // ───────────────────────────────────────────── pricing
  readonly pricing: PricingRepository = {
    get: async () => {
      const { data, error } = await this.client.from('pricing_rules').select('*').eq('id', 'pricing-low').maybeSingle();
      if (error) throw new Error(`Supabase pricing.get: ${error.message}`);
      if (data) return data as PricingRulesRecord;
      const fallback: PricingRulesRecord = {
        id: 'pricing-low',
        base: 5_000,
        perCore: 7_000,
        perGbRam: 4_500,
        perGbStorage: 300,
        roundTo: 500,
        minPrice: 45_000,
        updatedBy: null,
        updatedAt: new Date().toISOString(),
      };
      await this.client.from('pricing_rules').insert(fallback);
      return fallback;
    },
    update: async (rules: PricingRulesRecord) => {
      const { error } = await this.client.from('pricing_rules').upsert(rules, { onConflict: 'id' });
      if (error) throw new Error(`Supabase pricing.update: ${error.message}`);
    },
  };

  // ───────────────────────────────────────────── coupons
  readonly coupons: CouponRepository = {
    list: async () => {
      const { data, error } = await this.client.from('coupons').select('*').order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase coupons.list: ${error.message}`);
      return (data ?? []) as CouponRecord[];
    },
    getByCode: async (code: string) => {
      const { data, error } = await this.client
        .from('coupons')
        .select('*')
        .ilike('code', code.trim())
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`Supabase coupons.getByCode: ${error.message}`);
      return (data as CouponRecord | null) ?? null;
    },
    create: async (coupon: CouponRecord) => {
      const { error } = await this.client.from('coupons').insert(coupon);
      if (error) throw new Error(`Supabase coupons.create: ${error.message}`);
    },
    update: async (id: string, patch: Partial<CouponRecord>) => {
      const { data, error } = await this.client
        .from('coupons')
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(`Supabase coupons.update: ${error.message}`);
      return (data as CouponRecord | null) ?? null;
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('coupons').delete().eq('id', id);
      if (error) throw new Error(`Supabase coupons.remove: ${error.message}`);
    },
    validate: async (input) => {
      const coupon = await this.coupons.getByCode(input.code);
      if (!coupon) return { ok: false, code: 'INVALID', reason: 'Kupon tidak ditemukan.' };
      const now = new Date();
      if (!coupon.active) return { ok: false, code: 'INACTIVE', reason: 'Kupon sedang tidak aktif.' };
      if (coupon.startsAt && new Date(coupon.startsAt) > now) {
        return { ok: false, code: 'NOT_STARTED', reason: 'Kupon belum berlaku.' };
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) {
        return { ok: false, code: 'EXPIRED', reason: 'Kupon sudah kedaluwarsa.' };
      }
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return { ok: false, code: 'LIMIT_REACHED', reason: 'Batas penggunaan kupon sudah tercapai.' };
      }
      if (coupon.applicableTiers.length > 0 && (input.tier === null || !coupon.applicableTiers.includes(input.tier))) {
        return { ok: false, code: 'TIER_MISMATCH', reason: 'Kupon tidak berlaku untuk layanan ini.' };
      }
      if (
        coupon.applicablePackages.length > 0 &&
        (input.packageId === null || !coupon.applicablePackages.includes(input.packageId))
      ) {
        return { ok: false, code: 'PACKAGE_MISMATCH', reason: 'Kupon tidak berlaku untuk paket ini.' };
      }
      if (input.subtotal < coupon.minOrder) {
        return {
          ok: false,
          code: 'MIN_ORDER',
          reason: `Kupon membutuhkan pesanan minimal Rp${coupon.minOrder.toLocaleString('id-ID')}.`,
        };
      }
      const { count, error } = await this.client
        .from('coupon_usages')
        .select('*', { count: 'exact', head: true })
        .eq('couponId', coupon.id)
        .eq('customerKey', input.customerKey);
      if (error) throw new Error(`Supabase coupon_usages.count: ${error.message}`);
      if ((count ?? 0) >= coupon.usesPerCustomer) {
        return { ok: false, code: 'PER_CUSTOMER_LIMIT', reason: 'Batas penggunaan kupon per pelanggan sudah tercapai.' };
      }
      const discount =
        coupon.type === 'percentage'
          ? Math.round((input.subtotal * coupon.value) / 100)
          : Math.min(coupon.value, input.subtotal);
      return { ok: true, code: coupon.code, coupon, discount };
    },
  };

  // ───────────────────────────────────────────── orders
  readonly orders: OrderRepository = {
    create: async (input) => {
      const payload = {
        order: input.order,
        item: input.item,
        coupon: input.coupon,
        audit: input.audit,
      };
      const { data, error } = await this.client.rpc('rpc_create_order', { payload });
      if (error) throw new Error(`Supabase rpc_create_order: ${error.message}`);
      const orderId = (data as { order_id: string } | null)?.order_id;
      if (!orderId) throw new Error('Supabase rpc_create_order tidak mengembalikan order id.');
      const created = await this.orders.findById(orderId);
      if (!created) throw new Error('Order gagal dibaca setelah dibuat.');
      return created;
    },
    findById: async (id: string) => {
      const { data, error } = await this.client.from(ORDER_TABLE).select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`Supabase orders.findById: ${error.message}`);
      return (data as OrderRecord | null) ?? null;
    },
    listByUser: async (userId: string) => {
      const { data, error } = await this.client
        .from(ORDER_TABLE)
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase orders.listByUser: ${error.message}`);
      return (data ?? []) as OrderRecord[];
    },
    listAdmin: async (input) => {
      const { from, to } = orderBy(input);
      let query = this.client.from(ORDER_TABLE).select('*', { count: 'exact' });
      if (input.status) query = query.eq('status', input.status);
      if (input.search) query = query.or(`id.ilike.%${input.search}%,customerName.ilike.%${input.search}%,customerEmail.ilike.%${input.search}%,serverName.ilike.%${input.search}%`);
      const { data, count, error } = await query.order('createdAt', { ascending: false }).range(from, to);
      if (error) throw new Error(`Supabase orders.listAdmin: ${error.message}`);
      return {
        items: (data ?? []) as OrderRecord[],
        total: count ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    },
    updateStatus: async (id: string, status: OrderRecord['status']) => {
      const { data, error } = await this.client
        .from(ORDER_TABLE)
        .update({ status, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(`Supabase orders.updateStatus: ${error.message}`);
      return (data as OrderRecord | null) ?? null;
    },
    stats: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: all, error } = await this.client.from(ORDER_TABLE).select('*');
      if (error) throw new Error(`Supabase orders.stats: ${error.message}`);
      const orders = (all ?? []) as OrderRecord[];

      const revenue = orders
        .filter((o) => !['cancelled', 'expired', 'refunded'].includes(o.status))
        .reduce((sum, o) => sum + o.total, 0);
      const customerEmails = new Set(orders.map((o) => o.customerEmail.toLowerCase()));
      const packageCounts = new Map<string, { label: string; count: number }>();
      for (const order of orders) {
        const key = order.packageId ?? orderCatalogKey(order);
        const entry = packageCounts.get(key) ?? { label: key, count: 0 };
        entry.count += 1;
        packageCounts.set(key, entry);
      }
      const couponMap = new Map<string, { count: number; discountTotal: number }>();
      for (const order of orders) {
        if (!order.couponCode) continue;
        const entry = couponMap.get(order.couponCode) ?? { count: 0, discountTotal: 0 };
        entry.count += 1;
        entry.discountTotal += order.discountAmount;
        couponMap.set(order.couponCode, entry);
      }
      const ordersByDay = new Map<string, { count: number; revenue: number }>();
      for (let i = 29; i >= 0; i -= 1) {
        const day = new Date(now.getTime() - i * 86_400_000);
        ordersByDay.set(day.toISOString().slice(0, 10), { count: 0, revenue: 0 });
      }
      for (const order of orders) {
        const key = order.createdAt.slice(0, 10);
        const entry = ordersByDay.get(key);
        if (entry) {
          entry.count += 1;
          entry.revenue += order.total;
        }
      }
      return {
        totalOrders: orders.length,
        ordersToday: orders.filter((o) => o.createdAt >= today).length,
        ordersThisMonth: orders.filter((o) => o.createdAt >= month).length,
        revenue,
        customerCount: customerEmails.size,
        packages: [...packageCounts.entries()]
          .map(([packageId, v]) => ({ packageId, label: v.label, count: v.count }))
          .sort((a, b) => b.count - a.count),
        couponUsage: [...couponMap.entries()].map(([code, v]) => ({
          code,
          count: v.count,
          discountTotal: v.discountTotal,
        })),
        ordersByDay: [...ordersByDay.entries()].map(([date, v]) => ({ date, ...v })),
      };
    },
  };

  // ───────────────────────────────────────────── saved configurations
  readonly savedConfigurations: SavedConfigurationRepository = {
    listByUser: async (userId: string) => {
      const { data, error } = await this.client
        .from('saved_configurations')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase savedConfigurations.listByUser: ${error.message}`);
      return (data ?? []) as SavedConfigurationRecord[];
    },
    create: async (config) => {
      const record: SavedConfigurationRecord = {
        ...config,
        id: generateId('sc'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const { error } = await this.client.from('saved_configurations').insert(record);
      if (error) throw new Error(`Supabase savedConfigurations.create: ${error.message}`);
      return record;
    },
    remove: async (id: string, userId: string) => {
      const { error } = await this.client.from('saved_configurations').delete().eq('id', id).eq('userId', userId);
      if (error) throw new Error(`Supabase savedConfigurations.remove: ${error.message}`);
    },
  };

  // ───────────────────────────────────────────── tickets
  readonly tickets: TicketRepository = {
    listByUser: async (userId: string) => {
      const { data, error } = await this.client
        .from('tickets')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase tickets.listByUser: ${error.message}`);
      return (data ?? []) as TicketRecord[];
    },
    listAdmin: async (input) => {
      const { from, to } = orderBy(input);
      let query = this.client.from('tickets').select('*', { count: 'exact' });
      if (input.status) query = query.eq('status', input.status);
      const { data, count, error } = await query.order('createdAt', { ascending: false }).range(from, to);
      if (error) throw new Error(`Supabase tickets.listAdmin: ${error.message}`);
      return {
        items: (data ?? []) as TicketRecord[],
        total: count ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    },
    create: async (input) => {
      const { data, error } = await this.client.rpc('rpc_create_ticket', {
        payload: { ticket: input.ticket, firstMessage: input.firstMessage },
      });
      if (error) throw new Error(`Supabase rpc_create_ticket: ${error.message}`);
      const id = (data as { ticket_id: string } | null)?.ticket_id;
      const created = id ? await this.tickets.findById(id) : null;
      if (!created) throw new Error('Tiket gagal dibaca setelah dibuat.');
      return created;
    },
    findById: async (id: string) => {
      const { data, error } = await this.client.from('tickets').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`Supabase tickets.findById: ${error.message}`);
      return (data as TicketRecord | null) ?? null;
    },
    messages: async (ticketId: string) => {
      const { data, error } = await this.client
        .from('ticket_messages')
        .select('*')
        .eq('ticketId', ticketId)
        .order('createdAt', { ascending: true });
      if (error) throw new Error(`Supabase tickets.messages: ${error.message}`);
      return (data ?? []) as TicketMessageRecord[];
    },
    addMessage: async (message) => {
      const record: TicketMessageRecord = { ...message, id: generateId('tm'), createdAt: new Date().toISOString() };
      const { error } = await this.client.from('ticket_messages').insert(record);
      if (error) throw new Error(`Supabase tickets.addMessage: ${error.message}`);
      return record;
    },
    updateStatus: async (id: string, status: TicketRecord['status']) => {
      const { data, error } = await this.client
        .from('tickets')
        .update({ status, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(`Supabase tickets.updateStatus: ${error.message}`);
      return (data as TicketRecord | null) ?? null;
    },
    updatePriority: async (id: string, priority: TicketRecord['priority']) => {
      const { data, error } = await this.client
        .from('tickets')
        .update({ priority, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(`Supabase tickets.updatePriority: ${error.message}`);
      return (data as TicketRecord | null) ?? null;
    },
  };

  // ───────────────────────────────────────────── notifications
  readonly notifications: NotificationRepository = {
    listByUser: async (userId: string, limit: number) => {
      const { data, error } = await this.client
        .from('notifications')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(limit);
      if (error) throw new Error(`Supabase notifications.listByUser: ${error.message}`);
      return (data ?? []) as NotificationRecord[];
    },
    unreadCount: async (userId: string) => {
      const { count, error } = await this.client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('userId', userId)
        .eq('read', false);
      if (error) throw new Error(`Supabase notifications.unreadCount: ${error.message}`);
      return count ?? 0;
    },
    markAllRead: async (userId: string) => {
      const { error } = await this.client.from('notifications').update({ read: true }).eq('userId', userId).eq('read', false);
      if (error) throw new Error(`Supabase notifications.markAllRead: ${error.message}`);
    },
    create: async (notification) => {
      const record: NotificationRecord = { ...notification, id: generateId('nt'), createdAt: new Date().toISOString() };
      const { error } = await this.client.from('notifications').insert(record);
      if (error) throw new Error(`Supabase notifications.create: ${error.message}`);
    },
  };

  // ───────────────────────────────────────────── blog
  readonly blog: BlogRepository = {
    listPublished: async () => {
      const { data, error } = await this.client
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('publishedAt', { ascending: false, nullsFirst: false });
      if (error) throw new Error(`Supabase blog.listPublished: ${error.message}`);
      return (data ?? []) as BlogPostRecord[];
    },
    listAll: async () => {
      const { data, error } = await this.client.from('blog_posts').select('*').order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase blog.listAll: ${error.message}`);
      return (data ?? []) as BlogPostRecord[];
    },
    getBySlug: async (slug: string) => {
      const { data, error } = await this.client.from('blog_posts').select('*').eq('slug', slug).maybeSingle();
      if (error) throw new Error(`Supabase blog.getBySlug: ${error.message}`);
      return (data as BlogPostRecord | null) ?? null;
    },
    getById: async (id: string) => {
      const { data, error } = await this.client.from('blog_posts').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`Supabase blog.getById: ${error.message}`);
      return (data as BlogPostRecord | null) ?? null;
    },
    create: async (post: BlogPostRecord) => {
      const { error } = await this.client.from('blog_posts').insert(post);
      if (error) throw new Error(`Supabase blog.create: ${error.message}`);
    },
    update: async (id: string, patch: Partial<BlogPostRecord>) => {
      const { data, error } = await this.client
        .from('blog_posts')
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(`Supabase blog.update: ${error.message}`);
      return (data as BlogPostRecord | null) ?? null;
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('blog_posts').delete().eq('id', id);
      if (error) throw new Error(`Supabase blog.remove: ${error.message}`);
    },
    categories: async () => {
      const { data, error } = await this.client.from('blog_categories').select('*').order('name', { ascending: true });
      if (error) throw new Error(`Supabase blog.categories: ${error.message}`);
      return (data ?? []) as BlogCategoryRecord[];
    },
    upsertCategory: async (category: BlogCategoryRecord) => {
      const { error } = await this.client.from('blog_categories').upsert(category, { onConflict: 'id' });
      if (error) throw new Error(`Supabase blog.upsertCategory: ${error.message}`);
    },
    removeCategory: async (id: string) => {
      const { error } = await this.client.from('blog_categories').delete().eq('id', id);
      if (error) throw new Error(`Supabase blog.removeCategory: ${error.message}`);
    },
    search: async (query: string) => {
      const q = query.trim();
      if (!q) return this.blog.listPublished();
      const { data, error } = await this.client
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`);
      if (error) throw new Error(`Supabase blog.search: ${error.message}`);
      return (data ?? []) as BlogPostRecord[];
    },
  };

  // ───────────────────────────────────────────── knowledge base
  readonly knowledgeBase: KnowledgeBaseRepository = {
    listPublished: async () => {
      const { data, error } = await this.client
        .from('knowledge_articles')
        .select('*')
        .eq('status', 'published')
        .order('publishedAt', { ascending: false, nullsFirst: false });
      if (error) throw new Error(`Supabase knowledgeBase.listPublished: ${error.message}`);
      return (data ?? []) as KnowledgeArticleRecord[];
    },
    listAll: async () => {
      const { data, error } = await this.client
        .from('knowledge_articles')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase knowledgeBase.listAll: ${error.message}`);
      return (data ?? []) as KnowledgeArticleRecord[];
    },
    getBySlug: async (slug: string) => {
      const { data, error } = await this.client
        .from('knowledge_articles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw new Error(`Supabase knowledgeBase.getBySlug: ${error.message}`);
      return (data as KnowledgeArticleRecord | null) ?? null;
    },
    getById: async (id: string) => {
      const { data, error } = await this.client.from('knowledge_articles').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`Supabase knowledgeBase.getById: ${error.message}`);
      return (data as KnowledgeArticleRecord | null) ?? null;
    },
    create: async (article: KnowledgeArticleRecord) => {
      const { error } = await this.client.from('knowledge_articles').insert(article);
      if (error) throw new Error(`Supabase knowledgeBase.create: ${error.message}`);
    },
    update: async (id: string, patch: Partial<KnowledgeArticleRecord>) => {
      const { data, error } = await this.client
        .from('knowledge_articles')
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(`Supabase knowledgeBase.update: ${error.message}`);
      return (data as KnowledgeArticleRecord | null) ?? null;
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('knowledge_articles').delete().eq('id', id);
      if (error) throw new Error(`Supabase knowledgeBase.remove: ${error.message}`);
    },
    search: async (query: string) => {
      const q = query.trim();
      if (!q) return this.knowledgeBase.listPublished();
      const { data, error } = await this.client
        .from('knowledge_articles')
        .select('*')
        .eq('status', 'published')
        .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%,category.ilike.%${q}%`);
      if (error) throw new Error(`Supabase knowledgeBase.search: ${error.message}`);
      return (data ?? []) as KnowledgeArticleRecord[];
    },
  };

  // ───────────────────────────────────────────── faq & testimonials
  readonly faq: FaqRepository = {
    list: async (input: { activeOnly: boolean }) => {
      let query = this.client.from('faq_items').select('*');
      if (input.activeOnly) query = query.eq('active', true);
      const { data, error } = await query.order('sortOrder', { ascending: true });
      if (error) throw new Error(`Supabase faq.list: ${error.message}`);
      return (data ?? []) as FaqItemRecord[];
    },
    create: async (item: FaqItemRecord) => {
      const { error } = await this.client.from('faq_items').insert(item);
      if (error) throw new Error(`Supabase faq.create: ${error.message}`);
    },
    update: async (id: string, patch: Partial<FaqItemRecord>) => {
      const { data, error } = await this.client.from('faq_items').update(patch).eq('id', id).select('*').maybeSingle();
      if (error) throw new Error(`Supabase faq.update: ${error.message}`);
      return (data as FaqItemRecord | null) ?? null;
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('faq_items').delete().eq('id', id);
      if (error) throw new Error(`Supabase faq.remove: ${error.message}`);
    },
  };

  readonly testimonials: TestimonialRepository = {
    list: async (input: { activeOnly: boolean }) => {
      let query = this.client.from('testimonials').select('*');
      if (input.activeOnly) query = query.eq('active', true);
      const { data, error } = await query.order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase testimonials.list: ${error.message}`);
      return (data ?? []) as TestimonialRecord[];
    },
    create: async (item: TestimonialRecord) => {
      const { error } = await this.client.from('testimonials').insert(item);
      if (error) throw new Error(`Supabase testimonials.create: ${error.message}`);
    },
    update: async (id: string, patch: Partial<TestimonialRecord>) => {
      const { data, error } = await this.client.from('testimonials').update(patch).eq('id', id).select('*').maybeSingle();
      if (error) throw new Error(`Supabase testimonials.update: ${error.message}`);
      return (data as TestimonialRecord | null) ?? null;
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('testimonials').delete().eq('id', id);
      if (error) throw new Error(`Supabase testimonials.remove: ${error.message}`);
    },
  };

  // ───────────────────────────────────────────── cms pages & legal
  readonly cmsPages: CmsPageRepository = {
    get: async (slug: string) => {
      const { data, error } = await this.client.from('cms_pages').select('*').eq('slug', slug).maybeSingle();
      if (error) throw new Error(`Supabase cmsPages.get: ${error.message}`);
      return (data as CmsPageRecord | null) ?? null;
    },
    list: async () => {
      const { data, error } = await this.client.from('cms_pages').select('*').order('slug', { ascending: true });
      if (error) throw new Error(`Supabase cmsPages.list: ${error.message}`);
      return (data ?? []) as CmsPageRecord[];
    },
    upsert: async (page: CmsPageRecord) => {
      const { error } = await this.client.from('cms_pages').upsert(page, { onConflict: 'id' });
      if (error) throw new Error(`Supabase cmsPages.upsert: ${error.message}`);
    },
  };

  readonly legal: LegalRepository = {
    get: async (slug: string) => {
      const { data, error } = await this.client.from('legal_documents').select('*').eq('slug', slug).maybeSingle();
      if (error) throw new Error(`Supabase legal.get: ${error.message}`);
      return (data as LegalDocumentRecord | null) ?? null;
    },
    list: async () => {
      const { data, error } = await this.client.from('legal_documents').select('*').order('slug', { ascending: true });
      if (error) throw new Error(`Supabase legal.list: ${error.message}`);
      return (data ?? []) as LegalDocumentRecord[];
    },
    upsert: async (doc: LegalDocumentRecord) => {
      const { error } = await this.client.from('legal_documents').upsert(doc, { onConflict: 'id' });
      if (error) throw new Error(`Supabase legal.upsert: ${error.message}`);
    },
  };

  // ───────────────────────────────────────────── incidents, maintenance, announcements
  readonly incidents: IncidentRepository = {
    list: async () => {
      const { data, error } = await this.client.from('incidents').select('*').order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase incidents.list: ${error.message}`);
      return (data ?? []) as IncidentRecord[];
    },
    listOpen: async () => {
      const { data, error } = await this.client
        .from('incidents')
        .select('*')
        .neq('status', 'resolved')
        .order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase incidents.listOpen: ${error.message}`);
      return (data ?? []) as IncidentRecord[];
    },
    get: async (id: string) => {
      const { data, error } = await this.client.from('incidents').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(`Supabase incidents.get: ${error.message}`);
      return (data as IncidentRecord | null) ?? null;
    },
    create: async (incident: IncidentRecord) => {
      const { error } = await this.client.from('incidents').insert(incident);
      if (error) throw new Error(`Supabase incidents.create: ${error.message}`);
    },
    update: async (id: string, patch: Partial<IncidentRecord>) => {
      const { data, error } = await this.client
        .from('incidents')
        .update({ ...patch, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(`Supabase incidents.update: ${error.message}`);
      return (data as IncidentRecord | null) ?? null;
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('incidents').delete().eq('id', id);
      if (error) throw new Error(`Supabase incidents.remove: ${error.message}`);
    },
  };

  readonly maintenance: MaintenanceRepository = {
    list: async () => {
      const { data, error } = await this.client
        .from('maintenance_windows')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase maintenance.list: ${error.message}`);
      return (data ?? []) as MaintenanceWindowRecord[];
    },
    listActive: async () => {
      const now = new Date().toISOString();
      const { data, error } = await this.client
        .from('maintenance_windows')
        .select('*')
        .in('status', ['scheduled', 'active'])
        .lte('startsAt', now)
        .gte('endsAt', now);
      if (error) throw new Error(`Supabase maintenance.listActive: ${error.message}`);
      return (data ?? []) as MaintenanceWindowRecord[];
    },
    upsert: async (window: MaintenanceWindowRecord) => {
      const { error } = await this.client.from('maintenance_windows').upsert(window, { onConflict: 'id' });
      if (error) throw new Error(`Supabase maintenance.upsert: ${error.message}`);
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('maintenance_windows').delete().eq('id', id);
      if (error) throw new Error(`Supabase maintenance.remove: ${error.message}`);
    },
  };

  readonly announcements: AnnouncementRepository = {
    listActive: async () => {
      const now = new Date().toISOString();
      const { data, error } = await this.client
        .from('announcements')
        .select('*')
        .eq('active', true)
        .or(`startsAt.is.null,startsAt.lte.${now}`)
        .or(`endsAt.is.null,endsAt.gte.${now}`)
        .order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase announcements.listActive: ${error.message}`);
      return (data ?? []) as AnnouncementRecord[];
    },
    list: async () => {
      const { data, error } = await this.client.from('announcements').select('*').order('createdAt', { ascending: false });
      if (error) throw new Error(`Supabase announcements.list: ${error.message}`);
      return (data ?? []) as AnnouncementRecord[];
    },
    upsert: async (announcement: AnnouncementRecord) => {
      const { error } = await this.client.from('announcements').upsert(announcement, { onConflict: 'id' });
      if (error) throw new Error(`Supabase announcements.upsert: ${error.message}`);
    },
    remove: async (id: string) => {
      const { error } = await this.client.from('announcements').delete().eq('id', id);
      if (error) throw new Error(`Supabase announcements.remove: ${error.message}`);
    },
  };

  // ───────────────────────────────────────────── settings
  readonly settings: SettingsRepository = {
    get: async () => {
      const { data, error } = await this.client.from('settings').select('*').eq('id', 'main').maybeSingle();
      if (error) throw new Error(`Supabase settings.get: ${error.message}`);
      if (data) return data as SettingsRecord;
      throw new Error('Tabel settings belum di-seed. Jalankan npm run db:seed.');
    },
    update: async (patch: Partial<SettingsRecord>) => {
      const current = await this.settings.get();
      const updated: SettingsRecord = { ...current, ...patch };
      const { error } = await this.client.from('settings').upsert(updated, { onConflict: 'id' });
      if (error) throw new Error(`Supabase settings.update: ${error.message}`);
      return updated;
    },
  };

  // ───────────────────────────────────────────── audit
  readonly audit: AuditRepository = {
    log: async (entry) => {
      const record: AuditLogRecord = { ...entry, id: generateId('al'), createdAt: new Date().toISOString() };
      const { error } = await this.client.from('audit_logs').insert(record);
      if (error) throw new Error(`Supabase audit.log: ${error.message}`);
    },
    list: async (input) => {
      const { from, to } = orderBy(input);
      let query = this.client.from('audit_logs').select('*', { count: 'exact' });
      if (input.resource) query = query.eq('resource', input.resource);
      if (input.search) {
        query = query.or(`actorEmail.ilike.%${input.search}%,action.ilike.%${input.search}%,resourceId.ilike.%${input.search}%`);
      }
      const { data, count, error } = await query.order('createdAt', { ascending: false }).range(from, to);
      if (error) throw new Error(`Supabase audit.list: ${error.message}`);
      return {
        items: (data ?? []) as AuditLogRecord[],
        total: count ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    },
  };

  // ───────────────────────────────────────────── rate limiting (DB-backed)
  readonly rateLimits: RateLimitRepository = {
    check: async (key, max, windowSeconds) => {
      const { data, error } = await this.client.rpc('rpc_rate_limit_check', {
        p_key: key,
        p_max: max,
        p_window_seconds: windowSeconds,
      });
      if (error) throw new Error(`Supabase rpc_rate_limit_check: ${error.message}`);
      const result = data as { allowed: boolean; retry_after: number } | null;
      if (!result) return { allowed: true, retryAfterSeconds: 0 };
      return { allowed: result.allowed, retryAfterSeconds: result.retry_after };
    },
  };

  async ping(): Promise<boolean> {
    const { error } = await this.client.from('settings').select('id').limit(1);
    return error === null;
  }
}
