import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';
import { generateId } from '@/lib/utils';

const couponSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/, 'Kode hanya boleh huruf, angka, strip, dan underscore.'),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().int().min(1).max(100_000_000),
  minOrder: z.number().int().min(0).max(1_000_000_000),
  maxUses: z.number().int().min(1).max(10_000_000).nullable(),
  usesPerCustomer: z.number().int().min(1).max(1000),
  active: z.boolean(),
  startsAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  applicableTiers: z.array(z.enum(['low', 'medium', 'high'])),
  applicablePackages: z.array(z.string().max(80)),
});

export async function GET(): Promise<Response> {
  try {
    const { db } = await requireAdmin('coupons.manage');
    const coupons = await db.coupons.list();
    return apiOk(coupons);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('coupons.manage');
    await requireWriteSecurity();
    const ip = await clientIp();

    const body: unknown = await request.json().catch(() => null);
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }
    const data = parsed.data;
    if (data.type === 'percentage' && data.value > 100) {
      return apiError(422, 'VALIDATION_ERROR', 'Diskon persentase maksimal 100%.');
    }

    const existing = await db.coupons.getByCode(data.code);
    if (existing) {
      return apiError(409, 'CODE_EXISTS', 'Kode kupon sudah digunakan.');
    }

    const now = new Date().toISOString();
    const coupon = {
      id: generateId('cp'),
      code: data.code.toUpperCase(),
      type: data.type,
      value: data.value,
      minOrder: data.minOrder,
      maxUses: data.maxUses,
      usedCount: 0,
      usesPerCustomer: data.usesPerCustomer,
      active: data.active,
      startsAt: data.startsAt,
      expiresAt: data.expiresAt,
      applicableTiers: data.applicableTiers,
      applicablePackages: data.applicablePackages,
      createdBy: session.email,
      createdAt: now,
      updatedAt: now,
    };
    await db.coupons.create(coupon);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'create',
      resource: 'coupon',
      resourceId: coupon.id,
      ipAddress: ip,
      metadata: { code: coupon.code },
    });
    return apiOk(coupon, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('coupons.manage');
    await requireWriteSecurity();
    const ip = await clientIp();
    const body: unknown = await request.json().catch(() => null);
    const id = (body as { id?: string } | null)?.id;
    if (!id) return apiError(422, 'VALIDATION_ERROR', 'id wajib diisi.');
    await db.coupons.remove(id);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'delete',
      resource: 'coupon',
      resourceId: id,
      ipAddress: ip,
      metadata: {},
    });
    return apiOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

