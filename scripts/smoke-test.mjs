#!/usr/bin/env node
/**
 * HTTP Smoke Test WangStore — acceptance test otomatis.
 *
 * Jalankan setelah `npm run build`:
 *   node scripts/smoke-test.mjs
 *
 * Skrip menyalakan `next start` di port PORT (default 3100), menjalankan
 * seluruh acceptance test, lalu mematikan server. Memakai fallback JSON
 * datastore (data/wangstore.json) jika Supabase tidak dikonfigurasi.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const PORT = Number(process.env.SMOKE_PORT ?? 3100);
const BASE = `http://localhost:${PORT}`;

let failures = 0;
let passed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label} ${detail}`);
  }
}

function cookieHeader(jar) {
  return jar.map((c) => `${c.name}=${c.value}`).join('; ');
}

function parseSetCookie(setCookieArray, jar) {
  for (const header of setCookieArray ?? []) {
    const [pair] = header.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const existing = jar.findIndex((c) => c.name === name);
    if (existing >= 0) jar[existing] = { name, value };
    else jar.push({ name, value });
  }
}

async function request(path, { method = 'GET', body, headers = {}, jar } = {}) {
  const requestHeaders = { ...headers };
  if (jar && jar.length > 0) requestHeaders.cookie = cookieHeader(jar);
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json', ...requestHeaders } : requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  if (jar) parseSetCookie(response.headers.getSetCookie?.() ?? [], jar);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // bukan JSON
  }
  return { status: response.status, json, text, redirect: response.headers.get('location') };
}

const PUBLIC_PAGES = [
  '/',
  '/about',
  '/infrastructure',
  '/server-builder',
  '/features',
  '/why-wangstore',
  '/faq',
  '/testimonials',
  '/blog',
  '/knowledge-base',
  '/status',
  '/contact',
  '/terms',
  '/privacy',
  '/refund',
  '/sla',
  '/acceptable-use',
  '/cookie-policy',
];

function orderPayload(overrides = {}) {
  return {
    customerName: 'Smoke Tester',
    customerWhatsapp: '6281234567890',
    customerEmail: `smoke-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`,
    serverName: 'smoke-server',
    notes: '',
    couponCode: '',
    tier: 'low',
    cpu: 2,
    ramGb: 4,
    storageGb: 20,
    agreeTerms: true,
    ...overrides,
  };
}

async function main() {
  console.log(`\nWangStore smoke test — ${BASE}\n`);

  const dataDir = new URL('../data', import.meta.url).pathname;
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      JWT_SECRET: process.env.JWT_SECRET || 'smoke-test-secret-0123456789abcdef',
      WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || '6281234567890',
      EMAIL_PROVIDER: 'console',
      NEXT_PUBLIC_APP_URL: BASE,
      // Harness melakukan login untuk banyak peran (customer, owner, admin, staff);
      // batas login default 5/IP akan menghalangi test — bukan properti yang diuji di sini.
      RATE_LIMIT_LOGIN_MAX: process.env.RATE_LIMIT_LOGIN_MAX || '50',
      // Harness membuat banyak order (Low, Medium, High, VPS, kupon) dari satu IP.
      RATE_LIMIT_ORDER_MAX: process.env.RATE_LIMIT_ORDER_MAX || '100',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true, // grup proses sendiri agar child next-server ikut dimatikan
  });

  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});

  const exit = (code) => {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      // grup proses sudah mati
    }
    setTimeout(() => process.exit(code), 200);
  };

  // Tunggu server siap.
  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`${BASE}/api/status`);
      if (response.status < 500) {
        ready = true;
        break;
      }
    } catch {
      // belum siap
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) {
    console.error('Server tidak dapat dijalankan.');
    exit(1);
    return;
  }

  try {
    // ── Test 6: halaman publik → 200
    console.log('Test 6 — Halaman publik');
    for (const page of PUBLIC_PAGES) {
      const { status } = await request(page);
      assert(status === 200, `${page} → ${status}`);
    }

    // ── Test 7: rute privat → redirect /login
    console.log('Test 7 — Rute privat');
    const dashboard = await request('/dashboard');
    assert(dashboard.status === 307 && dashboard.redirect?.startsWith('/login'), '/dashboard → /login');
    const adminPage = await request('/admin');
    assert(adminPage.status === 307 && adminPage.redirect?.startsWith('/login'), '/admin → /login');

    // ── Test 1: harga paket High
    console.log('Test 1 — Harga paket High');
    const expectedHigh = {
      'high-2c4g': 300000,
      'high-3c6g': 420000,
      'high-4c8g': 600000,
      'high-6c12g': 850000,
      'high-8c16g': 1100000,
      'high-10c32g': 2100000,
    };
    for (const [packageId, price] of Object.entries(expectedHigh)) {
      const { status, json } = await request('/api/pricing/estimate', {
        method: 'POST',
        body: { tier: 'high', packageId },
      });
      assert(status === 200 && json?.data?.price === price, `estimate ${packageId} = ${price}`, JSON.stringify(json));
    }

    // ── Test 2: Low minimum = 45000
    console.log('Test 2 — Harga minimum Low');
    const lowMin = await request('/api/pricing/estimate', {
      method: 'POST',
      body: { tier: 'low', cpu: 2, ramGb: 4, storageGb: 20 },
    });
    assert(lowMin.status === 200 && lowMin.json?.data?.price === 45000, '2C/4G/20G → 45000');

    // ── Test 3: normalisasi overflow
    console.log('Test 3 — Normalisasi overflow Low');
    const overflow = await request('/api/pricing/estimate', {
      method: 'POST',
      body: { tier: 'low', cpu: 20, ramGb: 64, storageGb: 900 },
    });
    const overflowData = overflow.json?.data ?? {};
    assert(
      overflowData.cpu === 16 && overflowData.ramGb === 32 && overflowData.storageGb === 160,
      '20/64/900 → 16/32/160',
      JSON.stringify(overflowData),
    );

    // ── Test 4: Medium adalah tier paket tetap — paket wajib valid, tidak pernah Rp0.
    // (Penolakan tier berstatus ongoing/unavailable diuji pada Test 9b.)
    console.log('Test 4 — Tier Medium memerlukan paket yang valid');
    const medium = await request('/api/orders', { method: 'POST', body: orderPayload({ tier: 'medium' }) });
    assert(medium.status === 422, `POST medium tanpa paket → ${medium.status}`);
    assert(medium.json?.data?.total !== 0, 'tidak pernah Rp0');

    // ── Test 5: fake package → 422
    console.log('Test 5 — Paket palsu ditolak (422)');
    const fakePackage = await request('/api/orders', {
      method: 'POST',
      body: orderPayload({ tier: 'high', packageId: 'fake-package-id' }),
    });
    assert(fakePackage.status === 422, `POST fake package → ${fakePackage.status}`);

    // ── Test 9: CSRF lintas origin ditolak
    console.log('Test 9 — CSRF lintas origin');
    const csrfAttack = await request('/api/orders', {
      method: 'POST',
      headers: { origin: 'https://evil.example.com' },
      body: orderPayload(),
    });
    assert(csrfAttack.status === 403, `cross-origin write → ${csrfAttack.status}`);

    // ── Order sah dibuat + harga dihitung server (client price diabaikan)
    console.log('Order — harga server-side');
    const created = await request('/api/orders', {
      method: 'POST',
      body: orderPayload({ clientPrice: 1, clientTotal: 1 }),
    });
    assert(created.status === 201, `order created → ${created.status}`);
    const order = created.json?.data?.order;
    assert(order?.total === 45000, `total server = 45000`, JSON.stringify(order));
    const orderId = order?.id;
    const accessToken = created.json?.data?.accessToken;

    const orderPageNoToken = await request(`/order/${orderId}`);
    assert(orderPageNoToken.status === 404, 'halaman order tanpa token → 404');
    const orderPageWithToken = await request(`/order/${orderId}?token=${encodeURIComponent(accessToken ?? '')}`);
    assert(orderPageWithToken.status === 200, 'halaman order dengan token → 200');

    // ── Autentikasi: daftar → verifikasi → login
    console.log('Auth — register/verify/login');
    const email = `smoke-${Date.now()}@example.com`;
    const register = await request('/api/auth/register', {
      method: 'POST',
      body: { fullName: 'Smoke Tester', email, password: 'SmokePass123' },
    });
    assert(register.status === 201, `register → ${register.status}`);

    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'WrongPass123' },
    });
    assert(badLogin.status === 401, 'login kata sandi salah → 401');

    // Verifikasi email: provider console → token tercetak di log server.
    // Di sini kita ambil dari datastore JSON (mode smoke tanpa Supabase).
    const { readFileSync } = await import('node:fs');
    const dataPath = `${new URL('..', import.meta.url).pathname}/data/wangstore.json`;
    const data = JSON.parse(readFileSync(dataPath, 'utf8'));
    const user = data.users.find((u) => u.email === email);
    assert(Boolean(user?.emailVerificationToken), 'token verifikasi tersedia');

    const verify = await request(`/verify-email?token=${encodeURIComponent(user?.emailVerificationToken ?? '')}`);
    assert(verify.status === 200, `verify-email → ${verify.status}`);

    const userJar = [];
    const login = await request('/api/auth/login', {
      method: 'POST',
      jar: userJar,
      body: { email, password: 'SmokePass123' },
    });
    assert(login.status === 200, `login → ${login.status}`);

    const dashboardOk = await request('/dashboard', { jar: userJar });
    assert(dashboardOk.status === 200, 'dashboard pelanggan → 200');

    // ── Test 8: admin
    console.log('Test 8 — Admin & RBAC');
    const adminJar = [];
    const adminWrong = await request('/api/auth/login', {
      method: 'POST',
      jar: adminJar,
      body: { email: 'admin@wangstore.id', password: 'salah-sekali123' },
    });
    assert(adminWrong.status === 401, 'kredensial salah → 401');

    const adminLogin = await request('/api/auth/login', {
      method: 'POST',
      jar: adminJar,
      body: { email: 'admin@wangstore.id', password: process.env.ADMIN_PASSWORD || 'WangStoreDevAdmin2026!' },
    });
    assert(adminLogin.status === 200, 'kredensial benar → 200');
    assert(adminLogin.json?.data?.role === 'owner', 'role owner');

    const customerHitsAdminApi = await request('/api/admin/orders', { jar: userJar });
    assert(customerHitsAdminApi.status === 403, 'customer → /api/admin/* → 403');

    const adminOrders = await request('/api/admin/orders', { jar: adminJar });
    assert(adminOrders.status === 200 && adminOrders.json?.data?.total >= 1, 'admin → orders API → 200');

    const csrfToken = adminJar.find((c) => c.name === 'ws_csrf')?.value ?? '';
    const statusUpdate = await request(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      jar: adminJar,
      headers: { 'x-csrf-token': csrfToken },
      body: { status: 'paid' },
    });
    assert(statusUpdate.status === 200 && statusUpdate.json?.data?.status === 'paid', 'ubah status order → paid');

    // ── Test 9: pemisahan wewenang Admin vs Staff (akun contoh mode JSON dev)
    console.log('Test 9 — Pemisahan peran Admin vs Staff');
    const staffJar = [];
    const staffLogin = await request('/api/auth/login', {
      method: 'POST',
      jar: staffJar,
      body: { email: 'staff.demo@wangstore.id', password: process.env.STAFF_PASSWORD || 'WangStoreDevStaff2026!' },
    });
    if (staffLogin.status === 200 && staffLogin.json?.data?.role === 'staff') {
      const staffCsrf = staffJar.find((c) => c.name === 'ws_csrf')?.value ?? '';
      assert(true, 'login staff → 200 role staff');

      // Operasional: boleh.
      const staffOrders = await request('/api/admin/orders', { jar: staffJar });
      assert(staffOrders.status === 200, 'staff → orders API → 200');
      const staffTickets = await request('/api/admin/tickets', { jar: staffJar });
      assert(staffTickets.status === 200, 'staff → tickets API → 200');
      const staffStatus = await request('/api/admin/settings', {
        method: 'PUT',
        jar: staffJar,
        headers: { 'x-csrf-token': staffCsrf },
        body: { platformStatus: 'operational' },
      });
      assert(staffStatus.status === 200, 'staff → ubah status layanan → 200');

      // Baca-saja: boleh membaca.
      const staffReadCms = await request('/api/admin/cms/blog', { jar: staffJar });
      assert(staffReadCms.status === 200, 'staff → baca CMS blog → 200');
      const staffReadCustomers = await request('/api/admin/customers', { jar: staffJar });
      assert(staffReadCustomers.status === 200, 'staff → baca pelanggan → 200');

      // Konfigurasi: ditolak.
      const staffPricing = await request('/api/admin/pricing', {
        method: 'PUT',
        jar: staffJar,
        headers: { 'x-csrf-token': staffCsrf },
        body: { base: 1, perCore: 1, perGbRam: 1, perGbStorage: 1, roundTo: 500, minPrice: 45000 },
      });
      assert(staffPricing.status === 403, 'staff → ubah harga → 403');
      const staffWriteCms = await request('/api/admin/cms/faq', {
        method: 'POST',
        jar: staffJar,
        headers: { 'x-csrf-token': staffCsrf },
        body: { question: 'Uji staff', answer: 'x', category: 'Umum', sortOrder: 1, active: true },
      });
      assert(staffWriteCms.status === 403, 'staff → tulis CMS → 403');
      const staffBranding = await request('/api/admin/settings', {
        method: 'PUT',
        jar: staffJar,
        headers: { 'x-csrf-token': staffCsrf },
        body: { siteName: 'Bukan WangStore' },
      });
      assert(staffBranding.status === 403, 'staff → ubah branding → 403');
      const staffAudit = await request('/api/admin/audit-logs', { jar: staffJar });
      assert(staffAudit.status === 403, 'staff → audit log → 403');
      const staffAnalytics = await request('/api/admin/analytics', { jar: staffJar });
      assert(staffAnalytics.status === 403, 'staff → analitik → 403');

      // Halaman khusus admin/owner dialihkan ke /admin/forbidden.
      const staffAnalyticsPage = await request('/admin/analytics', { jar: staffJar });
      const redirectedToForbidden =
        (staffAnalyticsPage.redirect ?? '').includes('/admin/forbidden') ||
        (staffAnalyticsPage.text ?? '').includes('/admin/forbidden');
      assert(redirectedToForbidden, 'staff → /admin/analytics → /admin/forbidden', String(staffAnalyticsPage.status));

      // Admin: boleh konfigurasi, tetapi bukan role & maintenance (Owner-only).
      const adminJar2 = [];
      const adminLogin2 = await request('/api/auth/login', {
        method: 'POST',
        jar: adminJar2,
        body: { email: 'admin.demo@wangstore.id', password: process.env.STAFF_PASSWORD || 'WangStoreDevStaff2026!' },
      });
      if (adminLogin2.status === 200 && adminLogin2.json?.data?.role === 'admin') {
        const adminCsrf2 = adminJar2.find((c) => c.name === 'ws_csrf')?.value ?? '';
        const adminAudit = await request('/api/admin/audit-logs', { jar: adminJar2 });
        assert(adminAudit.status === 200, 'admin → audit log → 200');
        const adminMaintenance = await request('/api/admin/settings', {
          method: 'PUT',
          jar: adminJar2,
          headers: { 'x-csrf-token': adminCsrf2 },
          body: { maintenanceMode: true },
        });
        assert(adminMaintenance.status === 403, 'admin → mode maintenance → 403 (Owner-only)');
      } else {
        console.log('  … akun contoh admin tidak tersedia — dilewati');
      }
    } else {
      console.log('  … akun contoh staff tidak tersedia (bukan mode JSON dev) — dilewati');
    }

    // ── Test 9b: katalog VPS & tier Medium (paket tetap) + kontrol ketersediaan
    console.log('Test 9b — Katalog VPS, tier Medium & ketersediaan');
    const vpsCatalog = await request('/api/vps-packages');
    const vpsList = vpsCatalog.json?.data?.packages ?? [];
    assert(vpsCatalog.status === 200 && Array.isArray(vpsList), '/api/vps-packages → 200');

    const pricingCatalog = await request('/api/pricing');
    const mediumPackages = pricingCatalog.json?.data?.medium?.packages ?? [];
    assert(mediumPackages.length > 0, 'katalog paket Medium tersedia di /api/pricing');
    assert(Boolean(pricingCatalog.json?.data?.catalogStatus), '/api/pricing menyertakan catalogStatus');

    const firstVps = vpsList[0];
    if (firstVps) {
      const vpsOrder = await request('/api/orders', {
        method: 'POST',
        headers: { origin: BASE },
        body: {
          customerName: 'Pembeli VPS',
          customerWhatsapp: '6281234567890',
          customerEmail: 'vps@example.com',
          serverName: 'app-produksi',
          notes: '',
          couponCode: '',
          service: 'vps',
          packageId: firstVps.id,
          agreeTerms: true,
        },
      });
      assert(vpsOrder.status === 201, 'order VPS → 201');
      assert(vpsOrder.json?.data?.order?.service === 'vps', 'order tercatat sebagai layanan VPS');
      assert(vpsOrder.json?.data?.order?.tier === null, 'order VPS tidak memakai tier');
      assert(
        vpsOrder.json?.data?.order?.total === firstVps.price,
        'harga VPS dihitung server dari katalog',
        String(vpsOrder.json?.data?.order?.total),
      );

      const fakeVps = await request('/api/orders', {
        method: 'POST',
        headers: { origin: BASE },
        body: {
          customerName: 'Pembeli VPS',
          customerWhatsapp: '6281234567890',
          customerEmail: 'vps@example.com',
          serverName: 'app-produksi',
          notes: '',
          couponCode: '',
          service: 'vps',
          packageId: 'paket-hantu',
          agreeTerms: true,
        },
      });
      assert(fakeVps.status === 422, 'paket VPS palsu → 422');
    }

    const firstMedium = mediumPackages[0];
    if (firstMedium) {
      const mediumOrder = await request('/api/orders', {
        method: 'POST',
        headers: { origin: BASE },
        body: {
          customerName: 'Pembeli Medium',
          customerWhatsapp: '6281234567890',
          customerEmail: 'medium@example.com',
          serverName: 'server-medium',
          notes: '',
          couponCode: '',
          service: 'minecraft',
          tier: 'medium',
          packageId: firstMedium.id,
          agreeTerms: true,
        },
      });
      assert(mediumOrder.status === 201, 'order tier Medium → 201 (tier sudah tersedia)');
      assert(
        mediumOrder.json?.data?.order?.total === firstMedium.price,
        'harga Medium dihitung server dari katalog',
      );

      const wrongTier = await request('/api/orders', {
        method: 'POST',
        headers: { origin: BASE },
        body: {
          customerName: 'Pembeli Medium',
          customerWhatsapp: '6281234567890',
          customerEmail: 'medium@example.com',
          serverName: 'server-medium',
          notes: '',
          couponCode: '',
          service: 'minecraft',
          tier: 'medium',
          packageId: 'high-4c8g',
          agreeTerms: true,
        },
      });
      assert(wrongTier.status === 422, 'paket High dipakai pada tier Medium → 422');
    }

    // Admin menutup penjualan VPS → order ditolak 409, lalu dibuka kembali.
    const closeVps = await request('/api/admin/settings', {
      method: 'PUT',
      jar: adminJar,
      headers: { 'x-csrf-token': csrfToken },
      body: { catalogStatus: { low: 'available', medium: 'available', high: 'available', vps: 'ongoing' } },
    });
    assert(closeVps.status === 200, 'admin/owner mengubah ketersediaan katalog → 200');
    if (firstVps) {
      const blocked = await request('/api/orders', {
        method: 'POST',
        headers: { origin: BASE },
        body: {
          customerName: 'Pembeli VPS',
          customerWhatsapp: '6281234567890',
          customerEmail: 'vps@example.com',
          serverName: 'app-produksi',
          notes: '',
          couponCode: '',
          service: 'vps',
          packageId: firstVps.id,
          agreeTerms: true,
        },
      });
      assert(blocked.status === 409, 'VPS berstatus ongoing → order ditolak 409');
    }
    const reopenVps = await request('/api/admin/settings', {
      method: 'PUT',
      jar: adminJar,
      headers: { 'x-csrf-token': csrfToken },
      body: { catalogStatus: { low: 'available', medium: 'available', high: 'available', vps: 'available' } },
    });
    assert(reopenVps.status === 200, 'ketersediaan VPS dikembalikan → 200');

    const vpsPage = await request('/vps');
    assert(vpsPage.status === 200, '/vps → 200');

    // ── Test 10: kupon
    console.log('Test 10 — Kupon');
    const validCoupon = await request('/api/coupons/validate', {
      method: 'POST',
      body: { code: 'WANGSTORE10', tier: 'high', packageId: 'high-4c8g', subtotal: 600000 },
    });
    assert(validCoupon.status === 200 && validCoupon.json?.data?.discount === 60000, 'kupon valid → diskon 60000');

    const invalidCoupon = await request('/api/coupons/validate', {
      method: 'POST',
      body: { code: 'KUPON-GHOST', tier: 'low', packageId: null, subtotal: 45000 },
    });
    assert(invalidCoupon.status === 422, 'kupon tidak dikenal → 422');

    // Kupon kedaluwarsa (dibuat via admin) → ditolak.
    const expiredCode = `EXP${Date.now() % 1000000}`;
    const createExpired = await request('/api/admin/coupons', {
      method: 'POST',
      jar: adminJar,
      headers: { 'x-csrf-token': csrfToken },
      body: {
        code: expiredCode,
        type: 'percentage',
        value: 20,
        minOrder: 0,
        maxUses: null,
        usesPerCustomer: 1,
        active: true,
        startsAt: '2020-01-01T00:00:00.000Z',
        expiresAt: '2021-01-01T00:00:00.000Z',
        applicableTiers: [],
        applicablePackages: [],
      },
    });
    assert(createExpired.status === 201, 'kupon kedaluwarsa dibuat');
    const expiredCheck = await request('/api/coupons/validate', {
      method: 'POST',
      body: { code: expiredCode, tier: 'low', packageId: null, subtotal: 100000 },
    });
    assert(expiredCheck.status === 422, 'kupon kedaluwarsa → 422');

    // Kupon batas penggunaan: maxUses=1 → order pertama ok, kedua ditolak.
    const limitCode = `LIM${Date.now() % 1000000}`;
    await request('/api/admin/coupons', {
      method: 'POST',
      jar: adminJar,
      headers: { 'x-csrf-token': csrfToken },
      body: {
        code: limitCode,
        type: 'fixed',
        value: 10000,
        minOrder: 0,
        maxUses: 1,
        usesPerCustomer: 100,
        active: true,
        startsAt: null,
        expiresAt: null,
        applicableTiers: [],
        applicablePackages: [],
      },
    });
    const withCoupon = await request('/api/orders', {
      method: 'POST',
      body: orderPayload({ couponCode: limitCode, discount: 999999 }),
    });
    assert(withCoupon.status === 201, 'order dengan kupon limit → 201');
    assert(
      withCoupon.json?.data?.order?.discountAmount === 10000 && withCoupon.json?.data?.order?.total === 35000,
      'diskon server = 10000 (client diabaikan)',
    );
    const limitReached = await request('/api/orders', {
      method: 'POST',
      body: orderPayload({ couponCode: limitCode }),
    });
    assert(limitReached.status === 422, 'batas penggunaan kupon → 422');

    // ── API lain
    console.log('API lain');
    const statusApi = await request('/api/status');
    assert(statusApi.status === 200 && statusApi.json?.data?.platformStatus, '/api/status → 200');
    const productsApi = await request('/api/products');
    assert(productsApi.status === 200 && Array.isArray(productsApi.json?.data), '/api/products → 200');
    const blogApi = await request('/api/blog');
    assert(blogApi.status === 200 && Array.isArray(blogApi.json?.data), '/api/blog → 200');
    const kbApi = await request('/api/knowledge-base');
    assert(kbApi.status === 200 && Array.isArray(kbApi.json?.data), '/api/knowledge-base → 200');
    const pricingApi = await request('/api/pricing');
    assert(pricingApi.status === 200 && pricingApi.json?.data?.low?.minPrice === 45000, '/api/pricing → 200');
    const sitemap = await request('/sitemap.xml');
    assert(sitemap.status === 200, '/sitemap.xml → 200');
    const robots = await request('/robots.txt');
    assert(robots.status === 200, '/robots.txt → 200');
    const noTokenOrder = await request('/api/orders/ws_zzzzzzzzzz');
    assert(noTokenOrder.status === 404, 'order api tanpa token → 404');

    // ── 404 / error pages
    const notFoundPage = await request('/halaman-tidak-ada');
    assert(notFoundPage.status === 404, '/halaman-tidak-ada → 404');

    console.log(`\nHasil: ${passed} lulus, ${failures} gagal.\n`);
    exit(failures > 0 ? 1 : 0);
  } catch (error) {
    console.error('Smoke test error:', error);
    exit(1);
  }
}

main();
