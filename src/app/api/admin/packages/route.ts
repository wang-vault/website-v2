import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';

const packageSchema = z.object({
  id: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/, 'Id paket hanya boleh huruf kecil, angka, dan strip.'),
  label: z.string().trim().min(2).max(120),
  // Tier Low memakai konfigurasi custom (formula harga), jadi paket tetap
  // hanya berlaku untuk Medium dan High.
  tier: z.enum(['medium', 'high']),
  cpu: z.number().int().min(1).max(256),
  ramGb: z.number().int().min(1).max(4096),
  storageGb: z.number().int().min(1).max(100_000),
  price: z.number().int().min(0).max(1_000_000_000),
  popular: z.boolean(),
  /** Layanan pada paket ini dapat diperpanjang pelanggan. */
  renewable: z.boolean().optional().default(true),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
});

export async function GET(): Promise<Response> {
  try {
    const { db } = await requireAdmin('products.read');
    return apiOk(await db.packages.list());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('packages.manage');
    await requireWriteSecurity();
    const ip = await clientIp();
    const body: unknown = await request.json().catch(() => null);
    const parsed = packageSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }
    const existing = await db.packages.get(parsed.data.id);
    if (existing) return apiError(409, 'PACKAGE_EXISTS', 'Paket dengan id ini sudah ada.');

    const now = new Date().toISOString();
    const pkg = { ...parsed.data, createdAt: now, updatedAt: now };
    await db.packages.upsert(pkg);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'create',
      resource: 'package',
      resourceId: pkg.id,
      ipAddress: ip,
      metadata: { price: pkg.price },
    });
    return apiOk(pkg, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
