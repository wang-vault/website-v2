import { describe, expect, it } from 'vitest';
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_DEFINITIONS,
  ROLE_PERMISSIONS,
  assertPermission,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  minimumRoleFor,
  outranks,
  type Permission,
} from '@/lib/auth/rbac';
import { navGroupsForRole, navItemsForRole, ADMIN_NAV } from '@/lib/admin/nav';
import { CMS_RESOURCE_MAP } from '@/lib/cms';
import type { Role } from '@/types';

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

describe('matriks RBAC', () => {
  it('customer tidak memiliki izin panel apa pun', () => {
    expect(ROLE_PERMISSIONS.customer).toHaveLength(0);
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission('customer', permission)).toBe(false);
    }
  });

  it('admin mewarisi seluruh izin staff', () => {
    for (const permission of ROLE_PERMISSIONS.staff) {
      expect(hasPermission('admin', permission)).toBe(true);
    }
  });

  it('owner mewarisi seluruh izin admin', () => {
    for (const permission of ROLE_PERMISSIONS.admin) {
      expect(hasPermission('owner', permission)).toBe(true);
    }
  });

  it('jumlah izin bertambah seiring hierarki', () => {
    expect(ROLE_PERMISSIONS.customer.length).toBeLessThan(ROLE_PERMISSIONS.staff.length);
    expect(ROLE_PERMISSIONS.staff.length).toBeLessThan(ROLE_PERMISSIONS.admin.length);
    expect(ROLE_PERMISSIONS.admin.length).toBeLessThan(ROLE_PERMISSIONS.owner.length);
  });

  it('tidak ada izin duplikat pada satu role', () => {
    for (const role of ['staff', 'admin', 'owner'] as Role[]) {
      const list = ROLE_PERMISSIONS[role];
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('setiap izin punya label dan masuk tepat satu grup', () => {
    const grouped = PERMISSION_GROUPS.flatMap((group) => group.permissions);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(new Set(grouped)).toEqual(new Set(ALL_PERMISSIONS));
  });

  it('owner memiliki seluruh izin yang terdefinisi', () => {
    expect(new Set(ROLE_PERMISSIONS.owner)).toEqual(new Set(ALL_PERMISSIONS));
  });
});

describe('perbedaan Staff vs Admin', () => {
  const staffOperational: Permission[] = [
    'orders.read',
    'orders.update',
    'tickets.read',
    'tickets.reply',
    'status.read',
    'status.manage',
  ];

  const adminOnly: Permission[] = [
    'pricing.manage',
    'coupons.manage',
    'products.manage',
    'packages.manage',
    'content.manage',
    'legal.manage',
    'settings.manage',
    'customers.update',
    'analytics.read',
    'audit.read',
  ];

  it('staff dapat menjalankan seluruh tugas operasional', () => {
    expect(hasAllPermissions('staff', staffOperational)).toBe(true);
  });

  it('staff mendapat akses BACA pada data referensi', () => {
    expect(hasAllPermissions('staff', ['customers.read', 'pricing.read', 'coupons.read', 'products.read', 'content.read', 'settings.read'])).toBe(true);
  });

  it('staff tidak dapat mengubah konfigurasi apa pun', () => {
    for (const permission of adminOnly) {
      expect(hasPermission('staff', permission)).toBe(false);
      expect(hasPermission('admin', permission)).toBe(true);
    }
  });

  it('setiap izin ".manage" komersial punya pasangan ".read" untuk staff', () => {
    const pairs: [Permission, Permission][] = [
      ['pricing.read', 'pricing.manage'],
      ['coupons.read', 'coupons.manage'],
      ['products.read', 'products.manage'],
      ['content.read', 'content.manage'],
    ];
    for (const [read, manage] of pairs) {
      expect(hasPermission('staff', read)).toBe(true);
      expect(hasPermission('staff', manage)).toBe(false);
    }
  });
});

describe('wewenang khusus Owner', () => {
  it('hanya owner yang dapat mengubah role dan mode maintenance', () => {
    for (const permission of ['roles.manage', 'maintenance.manage'] as Permission[]) {
      expect(hasPermission('owner', permission)).toBe(true);
      expect(hasPermission('admin', permission)).toBe(false);
      expect(hasPermission('staff', permission)).toBe(false);
      expect(hasPermission('customer', permission)).toBe(false);
      expect(minimumRoleFor(permission)).toBe('owner');
    }
  });

  it('outranks mengikuti hierarki', () => {
    expect(outranks('owner', 'admin')).toBe(true);
    expect(outranks('admin', 'staff')).toBe(true);
    expect(outranks('staff', 'customer')).toBe(true);
    expect(outranks('admin', 'owner')).toBe(false);
    expect(outranks('staff', 'staff')).toBe(false);
  });
});

describe('helper izin', () => {
  it('hasAnyPermission benar untuk kombinasi', () => {
    expect(hasAnyPermission('staff', ['audit.read', 'orders.read'])).toBe(true);
    expect(hasAnyPermission('staff', ['audit.read', 'roles.manage'])).toBe(false);
  });

  it('assertPermission melempar 403 saat izin tidak dimiliki', () => {
    expect(() => assertPermission('admin', 'pricing.manage')).not.toThrow();
    try {
      assertPermission('staff', 'pricing.manage');
      throw new Error('seharusnya melempar');
    } catch (error) {
      expect((error as Error).message).toBe('FORBIDDEN');
      expect((error as Error & { status?: number }).status).toBe(403);
    }
  });

  it('minimumRoleFor mengembalikan role terendah pemilik izin', () => {
    expect(minimumRoleFor('orders.read')).toBe('staff');
    expect(minimumRoleFor('pricing.manage')).toBe('admin');
    expect(minimumRoleFor('roles.manage')).toBe('owner');
  });

  it('setiap role punya deskripsi wewenang', () => {
    for (const role of ['owner', 'admin', 'staff', 'customer'] as Role[]) {
      expect(ROLE_DEFINITIONS[role].summary.length).toBeGreaterThan(10);
      expect(ROLE_DEFINITIONS[role].can.length).toBeGreaterThan(0);
      expect(ROLE_DEFINITIONS[role].cannot.length).toBeGreaterThan(0);
    }
  });
});

describe('navigasi panel admin', () => {
  it('menu staff tidak memuat halaman khusus admin/owner', () => {
    const hrefs = navItemsForRole('staff').map((item) => item.href);
    expect(hrefs).toContain('/admin/orders');
    expect(hrefs).toContain('/admin/tickets');
    expect(hrefs).toContain('/admin/incidents');
    expect(hrefs).not.toContain('/admin/analytics');
    expect(hrefs).not.toContain('/admin/audit-logs');
    expect(hrefs).not.toContain('/admin/theme');
    expect(hrefs).not.toContain('/admin/maintenance');
  });

  it('menu admin tidak memuat mode maintenance (owner-only)', () => {
    const hrefs = navItemsForRole('admin').map((item) => item.href);
    expect(hrefs).toContain('/admin/analytics');
    expect(hrefs).toContain('/admin/audit-logs');
    expect(hrefs).not.toContain('/admin/maintenance');
  });

  it('owner melihat seluruh menu', () => {
    expect(navItemsForRole('owner')).toHaveLength(ADMIN_NAV.length);
  });

  it('customer tidak melihat menu panel selain yang tanpa izin khusus', () => {
    const hrefs = navItemsForRole('customer').map((item) => item.href);
    expect(hrefs.every((href) => href === '/admin' || href === '/admin/roles')).toBe(true);
  });

  it('menu bertanda baca-saja hanya untuk role tanpa izin tulis', () => {
    const staffPricing = navItemsForRole('staff').find((item) => item.href === '/admin/pricing');
    const adminPricing = navItemsForRole('admin').find((item) => item.href === '/admin/pricing');
    expect(staffPricing?.readOnly).toBe(true);
    expect(adminPricing?.readOnly).toBe(false);
  });

  it('pengelompokan menu tidak menghasilkan bagian kosong', () => {
    for (const role of ['staff', 'admin', 'owner'] as Role[]) {
      for (const group of navGroupsForRole(role)) {
        expect(group.items.length).toBeGreaterThan(0);
      }
    }
  });

  it('setiap izin menu benar-benar terdefinisi di matriks', () => {
    for (const item of ADMIN_NAV) {
      if (item.permission) expect(ALL_PERMISSIONS).toContain(item.permission);
      if (item.writePermission) expect(ALL_PERMISSIONS).toContain(item.writePermission);
    }
  });
});

describe('resource CMS memisahkan izin baca dan tulis', () => {
  it('staff dapat membaca seluruh resource CMS', () => {
    for (const definition of Object.values(CMS_RESOURCE_MAP)) {
      expect(hasPermission('staff', definition.readPermission)).toBe(true);
    }
  });

  it('staff hanya boleh menulis resource status (insiden & maintenance window)', () => {
    for (const [name, definition] of Object.entries(CMS_RESOURCE_MAP)) {
      const staffCanWrite = hasPermission('staff', definition.writePermission);
      const isStatusResource = name === 'incidents' || name === 'maintenanceWindows';
      expect(staffCanWrite).toBe(isStatusResource);
    }
  });

  it('admin dapat menulis seluruh resource CMS', () => {
    for (const definition of Object.values(CMS_RESOURCE_MAP)) {
      expect(hasPermission('admin', definition.writePermission)).toBe(true);
    }
  });
});
