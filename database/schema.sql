-- ============================================================================
-- WangStore — Skema Database Production (PostgreSQL via Supabase)
-- ============================================================================
-- Jalankan seluruh file ini melalui Supabase SQL Editor (database > sql).
-- Seluruh SQL production tersedia di file ini — tidak ada tabel yang dibuat
-- secara manual tanpa dokumentasi.
--
-- Konvensi: nama kolom camelCase (quoted identifier) agar pemetaan 1:1
-- dengan lapisan domain aplikasi (src/lib/db/supabase-store.ts).
--
-- Keamanan:
--  - Row Level Security aktif di seluruh tabel.
--  - Aplikasi mengakses data SERVER-SIDE dengan service role key dan
--    menegakkan RBAC di lapisan API; RLS adalah lapisan pertahanan kedua.
--  - Audit log hanya dapat dibaca oleh service role (bukan client).
-- ============================================================================

create extension if not exists pgcrypto;

-- ───────────────────────────────────────────── users & profiles
-- Tabel referensi role (lookup). Sumber kebenaran runtime adalah kolom
-- users.role; tabel ini memuat hierarki dan deskripsi untuk dokumentasi
-- dan tooling eksternal.
create table if not exists roles (
  name text primary key check (name in ('owner','admin','staff','customer')),
  hierarchy integer not null,
  description text not null default '',
  "createdAt" timestamptz not null default now()
);

--
-- Pembagian peran (detail matriks: src/lib/auth/rbac.ts dan halaman /admin/roles):
--  owner  — kepemilikan : seluruh wewenang admin + ubah role + mode maintenance.
--  admin  — konfigurasi : seluruh wewenang staff + ubah harga, kupon, produk,
--                         paket, konten/CMS, legal, settings + baca analitik & audit.
--  staff  — operasional : proses order, balas tiket, kelola status layanan &
--                         insiden; akses BACA-SAJA ke pelanggan, harga, kupon,
--                         produk, konten, dan settings.
--  customer            : hanya data miliknya sendiri, tanpa akses panel.
insert into roles (name, hierarchy, description) values
  ('owner', 3, 'Kepemilikan — seluruh wewenang admin, ubah role pengguna, dan mode maintenance.'),
  ('admin', 2, 'Konfigurasi — seluruh wewenang staff, ubah harga, kupon, produk, paket, konten, legal, settings, serta baca analitik dan audit log.'),
  ('staff', 1, 'Operasional — proses order, balas tiket, kelola status layanan dan insiden; baca-saja untuk pelanggan, harga, kupon, produk, dan konten.'),
  ('customer', 0, 'Pelanggan — akses dashboard, pesanan, dan tiket miliknya sendiri.')
on conflict (name) do update set hierarchy = excluded.hierarchy, description = excluded.description;

create table if not exists users (
  id text primary key,
  email text not null unique,
  "passwordHash" text not null,
  role text not null default 'customer' check (role in ('owner','admin','staff','customer')),
  "emailVerified" boolean not null default false,
  "emailVerificationToken" text,
  "resetToken" text,
  "resetTokenExpiresAt" timestamptz,
  "tokenVersion" integer not null default 1,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "lastLoginAt" timestamptz
);

create index if not exists idx_users_email on users (email);
create index if not exists idx_users_reset_token on users ("resetToken");
create index if not exists idx_users_verification_token on users ("emailVerificationToken");
create index if not exists idx_users_role on users (role);

create table if not exists profiles (
  "userId" text primary key references users (id) on delete cascade,
  "fullName" text not null default '',
  whatsapp text not null default '',
  discord text not null default '',
  bio text not null default '',
  "updatedAt" timestamptz not null default now()
);

-- ───────────────────────────────────────────── products & packages
create table if not exists products (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  tier text not null check (tier in ('low','medium','high')),
  status text not null default 'active' check (status in ('active','inactive')),
  "packageId" text,
  price bigint,
  visibility text not null default 'public' check (visibility in ('public','hidden')),
  metadata jsonb not null default '{}'::jsonb,
  "sortOrder" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists idx_products_slug on products (slug);

create table if not exists packages (
  id text primary key,
  label text not null,
  tier text not null default 'high' check (tier in ('low','medium','high')),
  cpu integer not null,
  "ramGb" integer not null,
  "storageGb" integer not null,
  price bigint not null,
  popular boolean not null default false,
  active boolean not null default true,
  "sortOrder" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- ───────────────────────────────────────────── pricing
create table if not exists pricing_rules (
  id text primary key,
  base bigint not null default 5000,
  "perCore" bigint not null default 7000,
  "perGbRam" bigint not null default 4500,
  "perGbStorage" bigint not null default 300,
  "roundTo" integer not null default 500,
  "minPrice" bigint not null default 45000,
  "updatedBy" text,
  "updatedAt" timestamptz not null default now()
);

-- ───────────────────────────────────────────── coupons
create table if not exists coupons (
  id text primary key,
  code text not null unique,
  type text not null check (type in ('percentage','fixed')),
  value bigint not null,
  "minOrder" bigint not null default 0,
  "maxUses" bigint,
  "usedCount" integer not null default 0,
  "usesPerCustomer" integer not null default 1,
  active boolean not null default true,
  "startsAt" timestamptz,
  "expiresAt" timestamptz,
  "applicableTiers" text[] not null default '{}',
  "applicablePackages" text[] not null default '{}',
  "createdBy" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists idx_coupons_code on coupons (code);

create table if not exists coupon_usages (
  id text primary key,
  "couponId" text not null references coupons (id) on delete cascade,
  "orderId" text not null,
  "customerKey" text not null,
  "createdAt" timestamptz not null default now()
);

create index if not exists idx_coupon_usages_coupon_customer on coupon_usages ("couponId", "customerKey");

-- ───────────────────────────────────────────── orders
create table if not exists orders (
  id text primary key,
  "userId" text references users (id) on delete set null,
  "customerName" text not null,
  "customerWhatsapp" text not null,
  "customerEmail" text not null,
  "serverName" text not null,
  notes text not null default '',
  tier text not null check (tier in ('low','medium','high')),
  "packageId" text,
  cpu integer not null,
  "ramGb" integer not null,
  "storageGb" integer not null,
  "unitPrice" bigint not null,
  "discountAmount" bigint not null default 0,
  "couponCode" text,
  total bigint not null,
  status text not null default 'pending' check (status in
    ('pending','awaiting_payment','paid','processing','completed','cancelled','expired','refunded')),
  "ipAddress" text,
  "accessTokenHash" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists idx_orders_user on orders ("userId");
create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_created on orders ("createdAt");
create index if not exists idx_orders_customer_email on orders ("customerEmail");

create table if not exists order_items (
  id text primary key,
  "orderId" text not null references orders (id) on delete cascade,
  "productId" text,
  description text not null,
  quantity integer not null default 1,
  "unitPrice" bigint not null,
  total bigint not null
);

create index if not exists idx_order_items_order on order_items ("orderId");

-- ───────────────────────────────────────────── saved configurations
create table if not exists saved_configurations (
  id text primary key,
  "userId" text not null references users (id) on delete cascade,
  name text not null,
  tier text not null check (tier in ('low','medium','high')),
  "packageId" text,
  cpu integer not null,
  "ramGb" integer not null,
  "storageGb" integer not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists idx_saved_configs_user on saved_configurations ("userId");

-- ───────────────────────────────────────────── tickets
create table if not exists tickets (
  id text primary key,
  "userId" text references users (id) on delete set null,
  "customerEmail" text not null,
  subject text not null,
  status text not null default 'open' check (status in ('open','pending','closed')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists idx_tickets_user on tickets ("userId");
create index if not exists idx_tickets_status on tickets (status);

create table if not exists ticket_messages (
  id text primary key,
  "ticketId" text not null references tickets (id) on delete cascade,
  "authorEmail" text not null,
  "isStaff" boolean not null default false,
  message text not null,
  "createdAt" timestamptz not null default now()
);

create index if not exists idx_ticket_messages_ticket on ticket_messages ("ticketId");

-- ───────────────────────────────────────────── notifications
create table if not exists notifications (
  id text primary key,
  "userId" text not null references users (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  "createdAt" timestamptz not null default now()
);

create index if not exists idx_notifications_user_read on notifications ("userId", read);

-- ───────────────────────────────────────────── blog
create table if not exists blog_categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null default ''
);

create table if not exists blog_posts (
  id text primary key,
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null,
  "categoryId" text references blog_categories (id) on delete set null,
  tags text[] not null default '{}',
  author text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  "publishedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists idx_blog_posts_slug on blog_posts (slug);
create index if not exists idx_blog_posts_status_published on blog_posts (status, "publishedAt");

-- ───────────────────────────────────────────── knowledge base
create table if not exists knowledge_articles (
  id text primary key,
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null,
  category text not null,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published')),
  "publishedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists idx_kb_slug on knowledge_articles (slug);
create index if not exists idx_kb_status_published on knowledge_articles (status, "publishedAt");

-- ───────────────────────────────────────────── faq & testimonials
create table if not exists faq_items (
  id text primary key,
  question text not null,
  answer text not null,
  category text not null default 'Umum',
  "sortOrder" integer not null default 0,
  active boolean not null default true
);

create table if not exists testimonials (
  id text primary key,
  name text not null,
  role text not null default '',
  content text not null,
  rating integer check (rating between 1 and 5),
  active boolean not null default true,
  "createdAt" timestamptz not null default now()
);

-- ───────────────────────────────────────────── CMS pages & legal
create table if not exists cms_pages (
  id text primary key,
  slug text not null unique,
  title text not null,
  content text not null default '',
  "metaTitle" text not null default '',
  "metaDescription" text not null default '',
  "updatedAt" timestamptz not null default now()
);

create table if not exists legal_documents (
  id text primary key,
  slug text not null unique,
  title text not null,
  content text not null,
  version text not null default '1.0',
  "publishedAt" timestamptz,
  "updatedAt" timestamptz not null default now()
);

-- ───────────────────────────────────────────── incidents & maintenance
create table if not exists incidents (
  id text primary key,
  title text not null,
  description text not null default '',
  status text not null default 'investigating' check (status in ('investigating','identified','monitoring','resolved')),
  severity text not null default 'minor' check (severity in ('none','minor','major','critical')),
  "affectedServices" text[] not null default '{}',
  "startedAt" timestamptz not null default now(),
  "resolvedAt" timestamptz,
  updates jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists idx_incidents_status on incidents (status);

create table if not exists maintenance_windows (
  id text primary key,
  title text not null,
  description text not null default '',
  status text not null default 'scheduled' check (status in ('scheduled','active','completed','cancelled')),
  "affectedServices" text[] not null default '{}',
  "startsAt" timestamptz not null,
  "endsAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- ───────────────────────────────────────────── announcements
create table if not exists announcements (
  id text primary key,
  title text not null,
  message text not null,
  active boolean not null default true,
  "startsAt" timestamptz,
  "endsAt" timestamptz,
  "createdAt" timestamptz not null default now()
);

-- ───────────────────────────────────────────── settings (satu baris, id='main')
create table if not exists settings (
  id text primary key,
  "siteName" text not null default 'WangStore',
  tagline text not null default 'Build Your Own Server.',
  "siteDescription" text not null default '',
  "whatsappNumber" text not null default '',
  "discordInviteUrl" text not null default '',
  "contactEmail" text not null default '',
  "maintenanceMode" boolean not null default false,
  "maintenanceTitle" text not null default '',
  "maintenanceMessage" text not null default '',
  "maintenanceEstimatedRestoration" text not null default '',
  "maintenanceAllowedPaths" text[] not null default '{}',
  "platformStatus" text not null default 'operational' check ("platformStatus" in ('operational','degraded','outage','maintenance')),
  services jsonb not null default '[]'::jsonb,
  "infrastructureNote" text not null default '',
  locations text[] not null default '{}',
  "paymentInstructions" text not null default '',
  "announcementBanner" text not null default ''
);

-- ───────────────────────────────────────────── audit log
create table if not exists audit_logs (
  id text primary key,
  "actorId" text,
  "actorEmail" text not null default '',
  action text not null,
  resource text not null,
  "resourceId" text,
  "ipAddress" text,
  metadata jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

create index if not exists idx_audit_resource on audit_logs (resource);
create index if not exists idx_audit_created on audit_logs ("createdAt");

-- ───────────────────────────────────────────── rate limits (serverless-compatible)
create table if not exists rate_limits (
  key text primary key,
  count integer not null default 0,
  "resetAt" bigint not null
);

-- ============================================================================
-- Row Level Security (defense in depth — aplikasi menegakkan RBAC di API;
-- service role tetap memerlukan akses penuh untuk operasi server)
-- ============================================================================
alter table users enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table packages enable row level security;
alter table pricing_rules enable row level security;
alter table coupons enable row level security;
alter table coupon_usages enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table saved_configurations enable row level security;
alter table tickets enable row level security;
alter table ticket_messages enable row level security;
alter table notifications enable row level security;
alter table blog_categories enable row level security;
alter table blog_posts enable row level security;
alter table knowledge_articles enable row level security;
alter table faq_items enable row level security;
alter table testimonials enable row level security;
alter table cms_pages enable row level security;
alter table legal_documents enable row level security;
alter table incidents enable row level security;
alter table maintenance_windows enable row level security;
alter table announcements enable row level security;
alter table settings enable row level security;
alter table audit_logs enable row level security;
alter table rate_limits enable row level security;

-- Publik hanya boleh membaca data yang memang publik.
create policy "baca publik products" on products for select using (status = 'active' and visibility = 'public');
create policy "baca publik packages" on packages for select using (active = true);
create policy "baca publik blog" on blog_posts for select using (status = 'published');
create policy "baca publik kb" on knowledge_articles for select using (status = 'published');
create policy "baca publik faq" on faq_items for select using (active = true);
create policy "baca publik testimonials" on testimonials for select using (active = true);
create policy "baca publik legal" on legal_documents for select using (true);
create policy "baca publik incidents" on incidents for select using (true);
create policy "baca publik maintenance" on maintenance_windows for select using (true);
create policy "baca publik announcements" on announcements for select using (active = true);
create policy "baca publik settings publik" on settings for select using (true);

-- Pelanggan hanya membaca data miliknya sendiri.
create policy "baca profil sendiri" on profiles for select using ("userId" = auth.uid()::text);
create policy "baca order sendiri" on orders for select using ("userId" = auth.uid()::text);
create policy "baca item order sendiri" on order_items for select using (
  "orderId" in (select id from orders where "userId" = auth.uid()::text)
);
create policy "baca konfigurasi sendiri" on saved_configurations for select using ("userId" = auth.uid()::text);
create policy "baca tiket sendiri" on tickets for select using ("userId" = auth.uid()::text);
create policy "baca pesan tiket sendiri" on ticket_messages for select using (
  "ticketId" in (select id from tickets where "userId" = auth.uid()::text)
);
create policy "baca notifikasi sendiri" on notifications for select using ("userId" = auth.uid()::text);

-- Audit log: tidak dapat dibaca oleh role client mana pun (hanya service role).
-- Service role melewati RLS, sehingga kebijakan berikut memblokir akses client:
create policy "blokir baca audit" on audit_logs for select using (false);
create policy "blokir baca users" on users for select using (auth.uid()::text = id);
create policy "blokir baca coupons" on coupons for select using (false);
create policy "blokir baca usages" on coupon_usages for select using (false);
create policy "blokir baca rate limits" on rate_limits for select using (false);
create policy "blokir baca pricing" on pricing_rules for select using (false);

-- ============================================================================
-- Fungsi transaksional (dipanggil aplikasi via supabase.rpc)
-- ============================================================================

-- rpc_create_order: membuat order + order item + increment penggunaan kupon
-- + entri audit dalam SATU transaksi. Rollback otomatis jika gagal.
create or replace function rpc_create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order jsonb := payload -> 'order';
  v_item jsonb := payload -> 'item';
  v_coupon jsonb := payload -> 'coupon';
  v_audit jsonb := payload -> 'audit';
  v_order_id text := v_order ->> 'id';
begin
  insert into orders (
    id, "userId", "customerName", "customerWhatsapp", "customerEmail",
    "serverName", notes, tier, "packageId", cpu, "ramGb", "storageGb",
    "unitPrice", "discountAmount", "couponCode", total, status,
    "ipAddress", "accessTokenHash", "createdAt", "updatedAt"
  ) values (
    v_order_id,
    nullif(v_order ->> 'userId', '')::text,
    v_order ->> 'customerName',
    v_order ->> 'customerWhatsapp',
    v_order ->> 'customerEmail',
    v_order ->> 'serverName',
    coalesce(v_order ->> 'notes', ''),
    v_order ->> 'tier',
    nullif(v_order ->> 'packageId', '')::text,
    (v_order ->> 'cpu')::integer,
    (v_order ->> 'ramGb')::integer,
    (v_order ->> 'storageGb')::integer,
    (v_order ->> 'unitPrice')::bigint,
    coalesce((v_order ->> 'discountAmount')::bigint, 0),
    nullif(v_order ->> 'couponCode', '')::text,
    (v_order ->> 'total')::bigint,
    coalesce(v_order ->> 'status', 'pending'),
    nullif(v_order ->> 'ipAddress', '')::text,
    nullif(v_order ->> 'accessTokenHash', '')::text,
    coalesce((v_order ->> 'createdAt')::timestamptz, now()),
    coalesce((v_order ->> 'updatedAt')::timestamptz, now())
  );

  insert into order_items (id, "orderId", "productId", description, quantity, "unitPrice", total)
  values (
    coalesce(v_item ->> 'id', gen_random_uuid()::text),
    v_order_id,
    nullif(v_item ->> 'productId', '')::text,
    v_item ->> 'description',
    coalesce((v_item ->> 'quantity')::integer, 1),
    (v_item ->> 'unitPrice')::bigint,
    (v_item ->> 'total')::bigint
  );

  if v_coupon is not null and (v_coupon ->> 'couponId') is not null then
    update coupons set "usedCount" = "usedCount" + 1, "updatedAt" = now()
    where id = v_coupon ->> 'couponId';
    insert into coupon_usages (id, "couponId", "orderId", "customerKey", "createdAt")
    values (
      gen_random_uuid()::text,
      v_coupon ->> 'couponId',
      v_order_id,
      v_coupon ->> 'customerKey',
      now()
    );
  end if;

  insert into audit_logs (id, "actorId", "actorEmail", action, resource, "resourceId", "ipAddress", metadata, "createdAt")
  values (
    gen_random_uuid()::text,
    nullif(v_audit ->> 'actorId', '')::text,
    coalesce(v_audit ->> 'actorEmail', ''),
    'create',
    'order',
    v_order_id,
    nullif(v_audit ->> 'ipAddress', '')::text,
    jsonb_build_object('total', (v_order ->> 'total')::bigint, 'tier', v_order ->> 'tier', 'coupon', v_order ->> 'couponCode'),
    now()
  );

  return jsonb_build_object('order_id', v_order_id);
end;
$$;

-- rpc_create_ticket: tiket + pesan pertama dalam satu transaksi.
create or replace function rpc_create_ticket(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket jsonb := payload -> 'ticket';
  v_message jsonb := payload -> 'firstMessage';
  v_ticket_id text := v_ticket ->> 'id';
begin
  insert into tickets (id, "userId", "customerEmail", subject, status, priority, "createdAt", "updatedAt")
  values (
    v_ticket_id,
    nullif(v_ticket ->> 'userId', '')::text,
    v_ticket ->> 'customerEmail',
    v_ticket ->> 'subject',
    coalesce(v_ticket ->> 'status', 'open'),
    coalesce(v_ticket ->> 'priority', 'medium'),
    coalesce((v_ticket ->> 'createdAt')::timestamptz, now()),
    coalesce((v_ticket ->> 'updatedAt')::timestamptz, now())
  );

  insert into ticket_messages (id, "ticketId", "authorEmail", "isStaff", message, "createdAt")
  values (
    coalesce(v_message ->> 'id', gen_random_uuid()::text),
    v_ticket_id,
    v_message ->> 'authorEmail',
    coalesce((v_message ->> 'isStaff')::boolean, false),
    v_message ->> 'message',
    coalesce((v_message ->> 'createdAt')::timestamptz, now())
  );

  return jsonb_build_object('ticket_id', v_ticket_id);
end;
$$;

-- rpc_rate_limit_check: counter atomik untuk rate limiting serverless-compatible.
create or replace function rpc_rate_limit_check(p_key text, p_max integer, p_window_seconds integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_window bigint := p_window_seconds * 1000;
  v_row rate_limits%rowtype;
begin
  select * into v_row from rate_limits where key = p_key;
  if not found or v_row."resetAt" <= v_now then
    insert into rate_limits (key, count, "resetAt")
    values (p_key, 1, v_now + v_window)
    on conflict (key) do update set count = 1, "resetAt" = v_now + v_window;
    return jsonb_build_object('allowed', true, 'retry_after', 0);
  end if;
  update rate_limits set count = count + 1 where key = p_key returning * into v_row;
  if v_row.count > p_max then
    return jsonb_build_object(
      'allowed', false,
      'retry_after', ceil((v_row."resetAt" - v_now) / 1000.0)::integer
    );
  end if;
  return jsonb_build_object('allowed', true, 'retry_after', 0);
end;
$$;
