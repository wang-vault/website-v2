import { promises as fs } from 'node:fs';
import path from 'node:path';
import { generateId, toIso } from '@/lib/utils';
import { buildSeedData } from './seed';
import type {
  AnnouncementRecord,
  AuditLogRecord,
  BlogCategoryRecord,
  BlogPostRecord,
  CouponRecord,
  CouponUsageRecord,
  FaqItemRecord,
  IncidentRecord,
  KnowledgeArticleRecord,
  LegalDocumentRecord,
  MaintenanceWindowRecord,
  NotificationRecord,
  OrderItemRecord,
  OrderRecord,
  PackageRecord,
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
 * Fallback JSON datastore untuk pengembangan lokal.
 *
 * - Penulisan atomik (file sementara + rename).
 * - Antrean penulisan terserialisasi (tidak ada race antar request).
 * - Seed otomatis pada akses pertama.
 * - HANYA untuk development/fallback — bukan datastore production.
 */

export interface JsonCollections {
  users: UserRecord[];
  profiles: ProfileRecord[];
  products: ProductRecord[];
  packages: PackageRecord[];
  pricing: PricingRulesRecord[];
  coupons: CouponRecord[];
  couponUsages: CouponUsageRecord[];
  orders: OrderRecord[];
  orderItems: OrderItemRecord[];
  savedConfigurations: SavedConfigurationRecord[];
  tickets: TicketRecord[];
  ticketMessages: TicketMessageRecord[];
  notifications: NotificationRecord[];
  blogPosts: BlogPostRecord[];
  blogCategories: BlogCategoryRecord[];
  knowledgeArticles: KnowledgeArticleRecord[];
  faqItems: FaqItemRecord[];
  testimonials: TestimonialRecord[];
  cmsPages: CmsPageRecord[];
  legalDocuments: LegalDocumentRecord[];
  incidents: IncidentRecord[];
  maintenanceWindows: MaintenanceWindowRecord[];
  announcements: AnnouncementRecord[];
  settings: SettingsRecord[];
  auditLogs: AuditLogRecord[];
}

export type CollectionName = keyof JsonCollections;

function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    total: items.length,
    page: safePage,
    pageSize: safeSize,
  };
}

const sortDescByCreatedAt = <T extends { createdAt: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export class JsonDataStore implements DataStore {
  readonly driver = 'json' as const;

  private collections: JsonCollections | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private rateLimitMemory = new Map<string, { count: number; resetAt: number }>();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async init(): Promise<void> {
    if (this.collections) return;
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object') {
        this.collections = parsed as JsonCollections;
        return;
      }
    } catch {
      // File belum ada atau rusak → seed baru.
    }
    this.collections = await buildSeedData();
    await this.persist();
  }

  /** Operasi baca hanya diperbolehkan setelah init. */
  private get data(): JsonCollections {
    if (!this.collections) {
      throw new Error('JSON datastore belum diinisialisasi. Panggil init() terlebih dahulu.');
    }
    return this.collections;
  }

  /** Mutasi terserialisasi: mencegah race antar request pada dev server. */
  private mutate<T>(fn: (collections: JsonCollections) => T): Promise<T> {
    const run = async (): Promise<T> => {
      const result = fn(this.data);
      await this.persist();
      return result;
    };
    const next = this.writeQueue.then(run, run);
    this.writeQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  /** Penulisan atomik: tulis file sementara lalu rename. */
  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
    await fs.rename(tmpPath, this.filePath);
  }

  // ───────────────────────────────────────────── users & profiles
  readonly users: UserRepository = {
    findByEmail: async (email: string) =>
      this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null,
    findByResetToken: async (token: string) =>
      this.data.users.find((u) => u.resetToken === token) ?? null,
    findByVerificationToken: async (token: string) =>
      this.data.users.find((u) => u.emailVerificationToken === token) ?? null,
    findById: async (id: string) => this.data.users.find((u) => u.id === id) ?? null,
    create: async (user: UserRecord) => {
      await this.mutate((c) => {
        c.users.push(user);
      });
    },
    update: async (id: string, patch: Partial<UserRecord>) => {
      const record = this.data.users.find((u) => u.id === id);
      if (!record) return null;
      const updated: UserRecord = { ...record, ...patch, updatedAt: toIso() };
      await this.mutate((c) => {
        const index = c.users.findIndex((u) => u.id === id);
        if (index >= 0) c.users[index] = updated;
      });
      return updated;
    },
    list: async (input: { search?: string; role?: string; page: number; pageSize: number }) => {
      let items = this.data.users;
      if (input.search) {
        const q = input.search.toLowerCase();
        items = items.filter((u) => u.email.toLowerCase().includes(q));
      }
      if (input.role) items = items.filter((u) => u.role === input.role);
      return paginate(sortDescByCreatedAt(items), input.page, input.pageSize);
    },
    count: async () => this.data.users.length,
  };

  readonly profiles: ProfileRepository = {
    get: async (userId: string) => this.data.profiles.find((p) => p.userId === userId) ?? null,
    upsert: async (profile: ProfileRecord) => {
      await this.mutate((c) => {
        const index = c.profiles.findIndex((p) => p.userId === profile.userId);
        if (index >= 0) c.profiles[index] = profile;
        else c.profiles.push(profile);
      });
    },
  };

  // ───────────────────────────────────────────── products & packages
  readonly products: ProductRepository = {
    list: async (input: { publicOnly: boolean }) =>
      this.data.products
        .filter((p) => (input.publicOnly ? p.status === 'active' && p.visibility === 'public' : true))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    getBySlug: async (slug: string) => this.data.products.find((p) => p.slug === slug) ?? null,
    create: async (product: ProductRecord) => {
      await this.mutate((c) => {
        c.products.push(product);
      });
    },
    update: async (id: string, patch: Partial<ProductRecord>) => {
      const record = this.data.products.find((p) => p.id === id);
      if (!record) return null;
      const updated: ProductRecord = { ...record, ...patch, updatedAt: toIso() };
      await this.mutate((c) => {
        const index = c.products.findIndex((p) => p.id === id);
        if (index >= 0) c.products[index] = updated;
      });
      return updated;
    },
    remove: async (id: string) => {
      await this.mutate((c) => {
        c.products = c.products.filter((p) => p.id !== id);
      });
    },
  };

  readonly packages: PackageRepository = {
    list: async () => [...this.data.packages].sort((a, b) => a.sortOrder - b.sortOrder),
    get: async (id: string) => this.data.packages.find((p) => p.id === id) ?? null,
    upsert: async (pkg: PackageRecord) => {
      await this.mutate((c) => {
        const index = c.packages.findIndex((p) => p.id === pkg.id);
        if (index >= 0) c.packages[index] = pkg;
        else c.packages.push(pkg);
      });
    },
    remove: async (id: string) => {
      await this.mutate((c) => {
        c.packages = c.packages.filter((p) => p.id !== id);
      });
    },
  };

  // ───────────────────────────────────────────── pricing
  readonly pricing: PricingRepository = {
    get: async () => this.data.pricing[0] as PricingRulesRecord,
    update: async (rules: PricingRulesRecord) => {
      await this.mutate((c) => {
        c.pricing = [rules];
      });
    },
  };

  // ───────────────────────────────────────────── coupons
  readonly coupons: CouponRepository = {
    list: async () => sortDescByCreatedAt(this.data.coupons),
    getByCode: async (code: string) =>
      this.data.coupons.find((c) => c.code.toLowerCase() === code.trim().toLowerCase()) ?? null,
    create: async (coupon: CouponRecord) => {
      await this.mutate((c) => {
        c.coupons.push(coupon);
      });
    },
    update: async (id: string, patch: Partial<CouponRecord>) => {
      const record = this.data.coupons.find((c) => c.id === id);
      if (!record) return null;
      const updated: CouponRecord = { ...record, ...patch, updatedAt: toIso() };
      await this.mutate((c) => {
        const index = c.coupons.findIndex((x) => x.id === id);
        if (index >= 0) c.coupons[index] = updated;
      });
      return updated;
    },
    remove: async (id: string) => {
      await this.mutate((c) => {
        c.coupons = c.coupons.filter((x) => x.id !== id);
      });
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
      if (coupon.applicableTiers.length > 0 && !coupon.applicableTiers.includes(input.tier)) {
        return { ok: false, code: 'TIER_MISMATCH', reason: 'Kupon tidak berlaku untuk tier ini.' };
      }
      if (
        coupon.applicablePackages.length > 0 &&
        (input.packageId === null || !coupon.applicablePackages.includes(input.packageId))
      ) {
        return { ok: false, code: 'PACKAGE_MISMATCH', reason: 'Kupon tidak berlaku untuk paket ini.' };
      }
      if (input.subtotal < coupon.minOrder) {
        return { ok: false, code: 'MIN_ORDER', reason: `Kupon membutuhkan pesanan minimal Rp${coupon.minOrder.toLocaleString('id-ID')}.` };
      }
      const customerUsages = this.data.couponUsages.filter((u) => u.couponId === coupon.id && u.customerKey === input.customerKey).length;
      if (customerUsages >= coupon.usesPerCustomer) {
        return { ok: false, code: 'PER_CUSTOMER_LIMIT', reason: 'Batas penggunaan kupon per pelanggan sudah tercapai.' };
      }
      let discount = 0;
      if (coupon.type === 'percentage') {
        discount = Math.round((input.subtotal * coupon.value) / 100);
      } else {
        discount = Math.min(coupon.value, input.subtotal);
      }
      return { ok: true, code: coupon.code, coupon, discount };
    },
  };

  // ───────────────────────────────────────────── orders
  readonly orders: OrderRepository = {
    create: async (input) => {
      const id = generateId('ws');
      const now = toIso();
      const order: OrderRecord = { ...input.order, id, createdAt: now, updatedAt: now };
      const item: OrderItemRecord = { id: generateId('oi'), orderId: id, productId: null, ...input.item };
      const couponRef = input.coupon;
      await this.mutate((c) => {
        c.orders.push(order);
        c.orderItems.push(item);
        if (couponRef) {
          const coupon = c.coupons.find((x) => x.id === couponRef.couponId);
          if (coupon) coupon.usedCount += 1;
          c.couponUsages.push({
            id: generateId('cu'),
            couponId: couponRef.couponId,
            orderId: id,
            customerKey: couponRef.customerKey,
            createdAt: now,
          });
        }
        c.auditLogs.push({
          id: generateId('al'),
          actorId: input.audit.actorId,
          actorEmail: input.audit.actorEmail,
          action: 'create',
          resource: 'order',
          resourceId: id,
          ipAddress: input.audit.ipAddress,
          metadata: { total: order.total, tier: order.tier, coupon: order.couponCode },
          createdAt: now,
        });
      });
      return order;
    },
    findById: async (id: string) => this.data.orders.find((o) => o.id === id) ?? null,
    listByUser: async (userId: string) =>
      sortDescByCreatedAt(this.data.orders.filter((o) => o.userId === userId)),
    listAdmin: async (input) => {
      let items = sortDescByCreatedAt(this.data.orders);
      if (input.status) items = items.filter((o) => o.status === input.status);
      if (input.search) {
        const q = input.search.toLowerCase();
        items = items.filter(
          (o) =>
            o.id.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerEmail.toLowerCase().includes(q) ||
            o.serverName.toLowerCase().includes(q),
        );
      }
      return paginate(items, input.page, input.pageSize);
    },
    updateStatus: async (id: string, status: OrderRecord['status']) => {
      const record = this.data.orders.find((o) => o.id === id);
      if (!record) return null;
      const updated: OrderRecord = { ...record, status, updatedAt: toIso() };
      await this.mutate((c) => {
        const index = c.orders.findIndex((o) => o.id === id);
        if (index >= 0) c.orders[index] = updated;
      });
      return updated;
    },
    stats: async () => {
      const orders = this.data.orders;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const todayOrders = orders.filter((o) => new Date(o.createdAt) >= todayStart);
      const monthOrders = orders.filter((o) => new Date(o.createdAt) >= monthStart);
      const revenue = orders
        .filter((o) => !['cancelled', 'expired', 'refunded'].includes(o.status))
        .reduce((sum, o) => sum + o.total, 0);
      const customerEmails = new Set(orders.map((o) => o.customerEmail.toLowerCase()));
      const packageCounts = new Map<string, { label: string; count: number }>();
      for (const order of orders) {
        const key = order.packageId ?? order.tier;
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
        const day = new Date(todayStart.getTime() - i * 86_400_000);
        const key = day.toISOString().slice(0, 10);
        ordersByDay.set(key, { count: 0, revenue: 0 });
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
        ordersToday: todayOrders.length,
        ordersThisMonth: monthOrders.length,
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
    listByUser: async (userId: string) =>
      sortDescByCreatedAt(this.data.savedConfigurations.filter((s) => s.userId === userId)),
    create: async (config) => {
      const record: SavedConfigurationRecord = {
        ...config,
        id: generateId('sc'),
        createdAt: toIso(),
        updatedAt: toIso(),
      };
      await this.mutate((c) => {
        c.savedConfigurations.push(record);
      });
      return record;
    },
    remove: async (id: string, userId: string) => {
      await this.mutate((c) => {
        c.savedConfigurations = c.savedConfigurations.filter((s) => !(s.id === id && s.userId === userId));
      });
    },
  };

  // ───────────────────────────────────────────── tickets
  readonly tickets: TicketRepository = {
    listByUser: async (userId: string) =>
      sortDescByCreatedAt(this.data.tickets.filter((t) => t.userId === userId)),
    listAdmin: async (input) => {
      let items = sortDescByCreatedAt(this.data.tickets);
      if (input.status) items = items.filter((t) => t.status === input.status);
      return paginate(items, input.page, input.pageSize);
    },
    create: async (input) => {
      const id = generateId('tk');
      const now = toIso();
      const ticket: TicketRecord = { ...input.ticket, id, createdAt: now, updatedAt: now };
      const message: TicketMessageRecord = {
        ...input.firstMessage,
        ticketId: id,
        id: generateId('tm'),
        createdAt: now,
      };
      await this.mutate((c) => {
        c.tickets.push(ticket);
        c.ticketMessages.push(message);
      });
      return ticket;
    },
    findById: async (id: string) => this.data.tickets.find((t) => t.id === id) ?? null,
    messages: async (ticketId: string) =>
      [...this.data.ticketMessages.filter((m) => m.ticketId === ticketId)].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
    addMessage: async (message) => {
      const record: TicketMessageRecord = { ...message, id: generateId('tm'), createdAt: toIso() };
      await this.mutate((c) => {
        c.ticketMessages.push(record);
      });
      return record;
    },
    updateStatus: async (id: string, status: TicketRecord['status']) => {
      const record = this.data.tickets.find((t) => t.id === id);
      if (!record) return null;
      const updated: TicketRecord = { ...record, status, updatedAt: toIso() };
      await this.mutate((c) => {
        const index = c.tickets.findIndex((t) => t.id === id);
        if (index >= 0) c.tickets[index] = updated;
      });
      return updated;
    },
    updatePriority: async (id: string, priority: TicketRecord['priority']) => {
      const record = this.data.tickets.find((t) => t.id === id);
      if (!record) return null;
      const updated: TicketRecord = { ...record, priority, updatedAt: toIso() };
      await this.mutate((c) => {
        const index = c.tickets.findIndex((t) => t.id === id);
        if (index >= 0) c.tickets[index] = updated;
      });
      return updated;
    },
  };

  // ───────────────────────────────────────────── notifications
  readonly notifications: NotificationRepository = {
    listByUser: async (userId: string, limit: number) =>
      sortDescByCreatedAt(this.data.notifications.filter((n) => n.userId === userId)).slice(0, limit),
    unreadCount: async (userId: string) =>
      this.data.notifications.filter((n) => n.userId === userId && !n.read).length,
    markAllRead: async (userId: string) => {
      await this.mutate((c) => {
        for (const n of c.notifications) {
          if (n.userId === userId) n.read = true;
        }
      });
    },
    create: async (notification) => {
      const record: NotificationRecord = { ...notification, id: generateId('nt'), createdAt: toIso() };
      await this.mutate((c) => {
        c.notifications.push(record);
      });
    },
  };

  // ───────────────────────────────────────────── blog
  readonly blog: BlogRepository = {
    listPublished: async () =>
      this.data.blogPosts
        .filter((p) => p.status === 'published')
        .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)),
    listAll: async () => sortDescByCreatedAt(this.data.blogPosts),
    getBySlug: async (slug: string) =>
      this.data.blogPosts.find((p) => p.slug === slug) ?? null,
    getById: async (id: string) => this.data.blogPosts.find((p) => p.id === id) ?? null,
    create: async (post: BlogPostRecord) => {
      await this.mutate((c) => {
        c.blogPosts.push(post);
      });
    },
    update: async (id: string, patch: Partial<BlogPostRecord>) => {
      const record = this.data.blogPosts.find((p) => p.id === id);
      if (!record) return null;
      const updated: BlogPostRecord = { ...record, ...patch, updatedAt: toIso() };
      await this.mutate((c) => {
        const index = c.blogPosts.findIndex((p) => p.id === id);
        if (index >= 0) c.blogPosts[index] = updated;
      });
      return updated;
    },
    remove: async (id: string) => {
      await this.mutate((c) => {
        c.blogPosts = c.blogPosts.filter((p) => p.id !== id);
      });
    },
    categories: async () => this.data.blogCategories,
    upsertCategory: async (category: BlogCategoryRecord) => {
      await this.mutate((c) => {
        const index = c.blogCategories.findIndex((x) => x.id === category.id);
        if (index >= 0) c.blogCategories[index] = category;
        else c.blogCategories.push(category);
      });
    },
    removeCategory: async (id: string) => {
      await this.mutate((c) => {
        c.blogCategories = c.blogCategories.filter((x) => x.id !== id);
      });
    },
    search: async (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return this.blog.listPublished();
      return this.data.blogPosts.filter(
        (p) =>
          p.status === 'published' &&
          (p.title.toLowerCase().includes(q) ||
            p.excerpt.toLowerCase().includes(q) ||
            p.content.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q)) ||
            (p.categoryId ?? '').toLowerCase().includes(q)),
      );
    },
  };

  // ───────────────────────────────────────────── knowledge base
  readonly knowledgeBase: KnowledgeBaseRepository = {
    listPublished: async () =>
      this.data.knowledgeArticles
        .filter((a) => a.status === 'published')
        .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)),
    listAll: async () => sortDescByCreatedAt(this.data.knowledgeArticles),
    getBySlug: async (slug: string) =>
      this.data.knowledgeArticles.find((a) => a.slug === slug) ?? null,
    getById: async (id: string) => this.data.knowledgeArticles.find((a) => a.id === id) ?? null,
    create: async (article: KnowledgeArticleRecord) => {
      await this.mutate((c) => {
        c.knowledgeArticles.push(article);
      });
    },
    update: async (id: string, patch: Partial<KnowledgeArticleRecord>) => {
      const record = this.data.knowledgeArticles.find((a) => a.id === id);
      if (!record) return null;
      const updated: KnowledgeArticleRecord = { ...record, ...patch, updatedAt: toIso() };
      await this.mutate((c) => {
        const index = c.knowledgeArticles.findIndex((a) => a.id === id);
        if (index >= 0) c.knowledgeArticles[index] = updated;
      });
      return updated;
    },
    remove: async (id: string) => {
      await this.mutate((c) => {
        c.knowledgeArticles = c.knowledgeArticles.filter((a) => a.id !== id);
      });
    },
    search: async (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return this.knowledgeBase.listPublished();
      return this.data.knowledgeArticles.filter(
        (a) =>
          a.status === 'published' &&
          (a.title.toLowerCase().includes(q) ||
            a.excerpt.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q) ||
            a.tags.some((t) => t.toLowerCase().includes(q))),
      );
    },
  };

  // ───────────────────────────────────────────── faq & testimonials
  readonly faq: FaqRepository = {
    list: async (input: { activeOnly: boolean }) =>
      this.data.faqItems
        .filter((f) => (input.activeOnly ? f.active : true))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    create: async (item: FaqItemRecord) => {
      await this.mutate((c) => {
        c.faqItems.push(item);
      });
    },
    update: async (id: string, patch: Partial<FaqItemRecord>) => {
      const record = this.data.faqItems.find((f) => f.id === id);
      if (!record) return null;
      const updated: FaqItemRecord = { ...record, ...patch };
      await this.mutate((c) => {
        const index = c.faqItems.findIndex((f) => f.id === id);
        if (index >= 0) c.faqItems[index] = updated;
      });
      return updated;
    },
    remove: async (id: string) => {
      await this.mutate((c) => {
        c.faqItems = c.faqItems.filter((f) => f.id !== id);
      });
    },
  };

  readonly testimonials: TestimonialRepository = {
    list: async (input: { activeOnly: boolean }) =>
      this.data.testimonials
        .filter((t) => (input.activeOnly ? t.active : true))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    create: async (item: TestimonialRecord) => {
      await this.mutate((c) => {
        c.testimonials.push(item);
      });
    },
    update: async (id: string, patch: Partial<TestimonialRecord>) => {
      const record = this.data.testimonials.find((t) => t.id === id);
      if (!record) return null;
      const updated: TestimonialRecord = { ...record, ...patch };
      await this.mutate((c) => {
        const index = c.testimonials.findIndex((t) => t.id === id);
        if (index >= 0) c.testimonials[index] = updated;
      });
      return updated;
    },
    remove: async (id: string) => {
      await this.mutate((c) => {
        c.testimonials = c.testimonials.filter((t) => t.id !== id);
      });
    },
  };

  // ───────────────────────────────────────────── cms pages & legal
  readonly cmsPages: CmsPageRepository = {
    get: async (slug: string) => this.data.cmsPages.find((p) => p.slug === slug) ?? null,
    list: async () => this.data.cmsPages,
    upsert: async (page: CmsPageRecord) => {
      await this.mutate((c) => {
        const index = c.cmsPages.findIndex((p) => p.id === page.id);
        if (index >= 0) c.cmsPages[index] = page;
        else c.cmsPages.push(page);
      });
    },
  };

  readonly legal: LegalRepository = {
    get: async (slug: string) => this.data.legalDocuments.find((d) => d.slug === slug) ?? null,
    list: async () => this.data.legalDocuments,
    upsert: async (doc: LegalDocumentRecord) => {
      await this.mutate((c) => {
        const index = c.legalDocuments.findIndex((d) => d.id === doc.id);
        if (index >= 0) c.legalDocuments[index] = doc;
        else c.legalDocuments.push(doc);
      });
    },
  };

  // ───────────────────────────────────────────── incidents, maintenance, announcements
  readonly incidents: IncidentRepository = {
    list: async () => sortDescByCreatedAt(this.data.incidents),
    listOpen: async () =>
      sortDescByCreatedAt(this.data.incidents.filter((i) => i.status !== 'resolved')),
    get: async (id: string) => this.data.incidents.find((i) => i.id === id) ?? null,
    create: async (incident: IncidentRecord) => {
      await this.mutate((c) => {
        c.incidents.push(incident);
      });
    },
    update: async (id: string, patch: Partial<IncidentRecord>) => {
      const record = this.data.incidents.find((i) => i.id === id);
      if (!record) return null;
      const updated: IncidentRecord = { ...record, ...patch, updatedAt: toIso() };
      await this.mutate((c) => {
        const index = c.incidents.findIndex((i) => i.id === id);
        if (index >= 0) c.incidents[index] = updated;
      });
      return updated;
    },
    remove: async (id: string) => {
      await this.mutate((c) => {
        c.incidents = c.incidents.filter((i) => i.id !== id);
      });
    },
  };

  readonly maintenance: MaintenanceRepository = {
    list: async () => sortDescByCreatedAt(this.data.maintenanceWindows),
    listActive: async () => {
      const now = new Date();
      return this.data.maintenanceWindows.filter(
        (m) =>
          ['scheduled', 'active'].includes(m.status) &&
          new Date(m.startsAt) <= now &&
          new Date(m.endsAt) >= now,
      );
    },
    upsert: async (window: MaintenanceWindowRecord) => {
      await this.mutate((c) => {
        const index = c.maintenanceWindows.findIndex((m) => m.id === window.id);
        if (index >= 0) c.maintenanceWindows[index] = window;
        else c.maintenanceWindows.push(window);
      });
    },
    remove: async (id: string) => {
      await this.mutate((c) => {
        c.maintenanceWindows = c.maintenanceWindows.filter((m) => m.id !== id);
      });
    },
  };

  readonly announcements: AnnouncementRepository = {
    listActive: async () => {
      const now = new Date();
      return sortDescByCreatedAt(
        this.data.announcements.filter((a) => {
          if (!a.active) return false;
          if (a.startsAt && new Date(a.startsAt) > now) return false;
          if (a.endsAt && new Date(a.endsAt) <= now) return false;
          return true;
        }),
      );
    },
    list: async () => sortDescByCreatedAt(this.data.announcements),
    upsert: async (announcement: AnnouncementRecord) => {
      await this.mutate((c) => {
        const index = c.announcements.findIndex((a) => a.id === announcement.id);
        if (index >= 0) c.announcements[index] = announcement;
        else c.announcements.push(announcement);
      });
    },
    remove: async (id: string) => {
      await this.mutate((c) => {
        c.announcements = c.announcements.filter((a) => a.id !== id);
      });
    },
  };

  // ───────────────────────────────────────────── settings
  readonly settings: SettingsRepository = {
    get: async () => {
      const current = this.data.settings[0];
      if (!current) throw new Error('Settings belum di-seed.');
      return current;
    },
    update: async (patch: Partial<SettingsRecord>) => {
      const current = await this.settings.get();
      const updated: SettingsRecord = { ...current, ...patch };
      await this.mutate((c) => {
        c.settings = [updated];
      });
      return updated;
    },
  };

  // ───────────────────────────────────────────── audit
  readonly audit: AuditRepository = {
    log: async (entry) => {
      const record: AuditLogRecord = { ...entry, id: generateId('al'), createdAt: toIso() };
      await this.mutate((c) => {
        c.auditLogs.push(record);
        // Batasi ukuran log lokal agar file tidak tumbuh tanpa batas.
        if (c.auditLogs.length > 5000) c.auditLogs = c.auditLogs.slice(-5000);
      });
    },
    list: async (input) => {
      let items = sortDescByCreatedAt(this.data.auditLogs);
      if (input.resource) items = items.filter((l) => l.resource === input.resource);
      if (input.search) {
        const q = input.search.toLowerCase();
        items = items.filter(
          (l) =>
            l.actorEmail.toLowerCase().includes(q) ||
            l.action.toLowerCase().includes(q) ||
            (l.resourceId ?? '').toLowerCase().includes(q),
        );
      }
      return paginate(items, input.page, input.pageSize);
    },
  };

  // ───────────────────────────────────────────── rate limiting (in-memory, dev)
  readonly rateLimits: RateLimitRepository = {
    check: async (key, max, windowSeconds) => {
      const now = Date.now();
      const windowMs = windowSeconds * 1000;
      const existing = this.rateLimitMemory.get(key);
      if (!existing || existing.resetAt <= now) {
        this.rateLimitMemory.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      existing.count += 1;
      if (existing.count > max) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };

  async ping(): Promise<boolean> {
    return true;
  }
}
