import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { clientIp } from '@/lib/security/rate-limit';
import { generateId, slugify } from '@/lib/utils';

const productSchema = z.object({
  slug: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(2000),
  tier: z.enum(['low', 'medium', 'high']),
  status: z.enum(['active', 'inactive']),
  /** Katalog yang dijual: tier Minecraft atau VPS. null = informasional. */
  catalogKey: z.enum(['low', 'medium', 'high', 'vps']).nullable().optional().default(null),
  packageId: z.string().max(80).nullable(),
  price: z.number().int().min(0).max(1_000_000_000).nullable(),
  visibility: z.enum(['public', 'hidden']),
  metadata: z.record(z.string(), z.string()).optional().default({}),
  sortOrder: z.number().int().min(0).max(10_000),
});

export async function GET(): Promise<Response> {
  try {
    const { db } = await requireAdmin('products.read');
    const products = await db.products.list({ publicOnly: false });
    return apiOk(products);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('products.manage');
    await requireWriteSecurity();
    const ip = await clientIp();
    const body: unknown = await request.json().catch(() => null);
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }
    const now = new Date().toISOString();
    const product = {
      id: generateId('pr'),
      ...parsed.data,
      slug: slugify(parsed.data.slug),
      createdAt: now,
      updatedAt: now,
    };
    await db.products.create(product);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'create',
      resource: 'product',
      resourceId: product.id,
      ipAddress: ip,
      metadata: { slug: product.slug },
    });
    return apiOk(product, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
