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
  OrderItemRecord,
  OrderRecord,
  OrderStatus,
  PackageRecord,
  CmsPageRecord,
  PricingRulesRecord,
  ProductRecord,
  ProfileRecord,
  Role,
  SavedConfigurationRecord,
  SettingsRecord,
  TestimonialRecord,
  TicketMessageRecord,
  TicketPriority,
  TicketRecord,
  TicketStatus,
  Tier,
  UserRecord,
} from '@/types';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrderStats {
  totalOrders: number;
  ordersToday: number;
  ordersThisMonth: number;
  revenue: number;
  customerCount: number;
  packages: { packageId: string; label: string; count: number }[];
  couponUsage: { code: string; count: number; discountTotal: number }[];
  ordersByDay: { date: string; count: number; revenue: number }[];
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findByResetToken(token: string): Promise<UserRecord | null>;
  findByVerificationToken(token: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(user: UserRecord): Promise<void>;
  update(id: string, patch: Partial<UserRecord>): Promise<UserRecord | null>;
  list(input: {
    search?: string;
    role?: Role;
    page: number;
    pageSize: number;
  }): Promise<Paginated<UserRecord>>;
  count(): Promise<number>;
}

export interface ProfileRepository {
  get(userId: string): Promise<ProfileRecord | null>;
  upsert(profile: ProfileRecord): Promise<void>;
}

export interface ProductRepository {
  list(input: { publicOnly: boolean }): Promise<ProductRecord[]>;
  getBySlug(slug: string): Promise<ProductRecord | null>;
  create(product: ProductRecord): Promise<void>;
  update(id: string, patch: Partial<ProductRecord>): Promise<ProductRecord | null>;
  remove(id: string): Promise<void>;
}

export interface PackageRepository {
  list(): Promise<PackageRecord[]>;
  get(id: string): Promise<PackageRecord | null>;
  upsert(pkg: PackageRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface PricingRepository {
  get(): Promise<PricingRulesRecord>;
  update(rules: PricingRulesRecord): Promise<void>;
}

export interface CouponValidationResult {
  ok: boolean;
  code?: string;
  reason?: string;
  coupon?: CouponRecord;
  discount?: number;
}

export interface CouponRepository {
  list(): Promise<CouponRecord[]>;
  getByCode(code: string): Promise<CouponRecord | null>;
  create(coupon: CouponRecord): Promise<void>;
  update(id: string, patch: Partial<CouponRecord>): Promise<CouponRecord | null>;
  remove(id: string): Promise<void>;
  /**
   * Validasi kupon secara server-side. Menghitung diskon sendiri —
   * klien tidak pernah menentukan nilai diskon.
   */
  validate(input: {
    code: string;
    tier: Tier;
    packageId: string | null;
    subtotal: number;
    customerKey: string;
  }): Promise<CouponValidationResult>;
}

export interface OrderRepository {
  create(input: {
    order: Omit<OrderRecord, 'id' | 'createdAt' | 'updatedAt'>;
    item: { description: string; quantity: number; unitPrice: number; total: number };
    coupon: { couponId: string; discount: number; customerKey: string } | null;
    audit: { actorId: string | null; actorEmail: string; ipAddress: string | null };
  }): Promise<OrderRecord>;
  findById(id: string): Promise<OrderRecord | null>;
  listByUser(userId: string): Promise<OrderRecord[]>;
  listAdmin(input: {
    status?: OrderStatus;
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<Paginated<OrderRecord>>;
  updateStatus(id: string, status: OrderStatus): Promise<OrderRecord | null>;
  stats(): Promise<OrderStats>;
}

export interface SavedConfigurationRepository {
  listByUser(userId: string): Promise<SavedConfigurationRecord[]>;
  create(config: Omit<SavedConfigurationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedConfigurationRecord>;
  remove(id: string, userId: string): Promise<void>;
}

export interface TicketRepository {
  listByUser(userId: string): Promise<TicketRecord[]>;
  listAdmin(input: { status?: TicketStatus; page: number; pageSize: number }): Promise<Paginated<TicketRecord>>;
  create(input: {
    ticket: Omit<TicketRecord, 'id' | 'createdAt' | 'updatedAt'>;
    firstMessage: Omit<TicketMessageRecord, 'id' | 'createdAt'>;
  }): Promise<TicketRecord>;
  findById(id: string): Promise<TicketRecord | null>;
  messages(ticketId: string): Promise<TicketMessageRecord[]>;
  addMessage(message: Omit<TicketMessageRecord, 'id' | 'createdAt'>): Promise<TicketMessageRecord>;
  updateStatus(id: string, status: TicketStatus): Promise<TicketRecord | null>;
  updatePriority(id: string, priority: TicketPriority): Promise<TicketRecord | null>;
}

export interface NotificationRepository {
  listByUser(userId: string, limit: number): Promise<NotificationRecord[]>;
  unreadCount(userId: string): Promise<number>;
  markAllRead(userId: string): Promise<void>;
  create(notification: Omit<NotificationRecord, 'id' | 'createdAt'>): Promise<void>;
}

export interface BlogRepository {
  listPublished(): Promise<BlogPostRecord[]>;
  listAll(): Promise<BlogPostRecord[]>;
  getBySlug(slug: string): Promise<BlogPostRecord | null>;
  getById(id: string): Promise<BlogPostRecord | null>;
  create(post: BlogPostRecord): Promise<void>;
  update(id: string, patch: Partial<BlogPostRecord>): Promise<BlogPostRecord | null>;
  remove(id: string): Promise<void>;
  categories(): Promise<BlogCategoryRecord[]>;
  upsertCategory(category: BlogCategoryRecord): Promise<void>;
  removeCategory(id: string): Promise<void>;
  search(query: string): Promise<BlogPostRecord[]>;
}

export interface KnowledgeBaseRepository {
  listPublished(): Promise<KnowledgeArticleRecord[]>;
  listAll(): Promise<KnowledgeArticleRecord[]>;
  getBySlug(slug: string): Promise<KnowledgeArticleRecord | null>;
  getById(id: string): Promise<KnowledgeArticleRecord | null>;
  create(article: KnowledgeArticleRecord): Promise<void>;
  update(id: string, patch: Partial<KnowledgeArticleRecord>): Promise<KnowledgeArticleRecord | null>;
  remove(id: string): Promise<void>;
  search(query: string): Promise<KnowledgeArticleRecord[]>;
}

export interface FaqRepository {
  list(input: { activeOnly: boolean }): Promise<FaqItemRecord[]>;
  create(item: FaqItemRecord): Promise<void>;
  update(id: string, patch: Partial<FaqItemRecord>): Promise<FaqItemRecord | null>;
  remove(id: string): Promise<void>;
}

export interface TestimonialRepository {
  list(input: { activeOnly: boolean }): Promise<TestimonialRecord[]>;
  create(item: TestimonialRecord): Promise<void>;
  update(id: string, patch: Partial<TestimonialRecord>): Promise<TestimonialRecord | null>;
  remove(id: string): Promise<void>;
}

export interface CmsPageRepository {
  get(slug: string): Promise<CmsPageRecord | null>;
  list(): Promise<CmsPageRecord[]>;
  upsert(page: CmsPageRecord): Promise<void>;
}

export interface LegalRepository {
  get(slug: string): Promise<LegalDocumentRecord | null>;
  list(): Promise<LegalDocumentRecord[]>;
  upsert(doc: LegalDocumentRecord): Promise<void>;
}

export interface IncidentRepository {
  list(): Promise<IncidentRecord[]>;
  listOpen(): Promise<IncidentRecord[]>;
  get(id: string): Promise<IncidentRecord | null>;
  create(incident: IncidentRecord): Promise<void>;
  update(id: string, patch: Partial<IncidentRecord>): Promise<IncidentRecord | null>;
  remove(id: string): Promise<void>;
}

export interface MaintenanceRepository {
  list(): Promise<MaintenanceWindowRecord[]>;
  listActive(): Promise<MaintenanceWindowRecord[]>;
  upsert(window: MaintenanceWindowRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface AnnouncementRepository {
  listActive(): Promise<AnnouncementRecord[]>;
  list(): Promise<AnnouncementRecord[]>;
  upsert(announcement: AnnouncementRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<SettingsRecord>;
  update(patch: Partial<SettingsRecord>): Promise<SettingsRecord>;
}

export interface AuditRepository {
  log(entry: Omit<AuditLogRecord, 'id' | 'createdAt'>): Promise<void>;
  list(input: {
    resource?: string;
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<Paginated<AuditLogRecord>>;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitRepository {
  check(key: string, max: number, windowSeconds: number): Promise<RateLimitResult>;
}

export interface DataStore {
  readonly driver: 'supabase' | 'json';
  users: UserRepository;
  profiles: ProfileRepository;
  products: ProductRepository;
  packages: PackageRepository;
  pricing: PricingRepository;
  coupons: CouponRepository;
  orders: OrderRepository;
  savedConfigurations: SavedConfigurationRepository;
  tickets: TicketRepository;
  notifications: NotificationRepository;
  blog: BlogRepository;
  knowledgeBase: KnowledgeBaseRepository;
  faq: FaqRepository;
  testimonials: TestimonialRepository;
  cmsPages: CmsPageRepository;
  legal: LegalRepository;
  incidents: IncidentRepository;
  maintenance: MaintenanceRepository;
  announcements: AnnouncementRepository;
  settings: SettingsRepository;
  audit: AuditRepository;
  rateLimits: RateLimitRepository;
  /** Health check sederhana untuk dipakai /api/status. */
  ping(): Promise<boolean>;
}
