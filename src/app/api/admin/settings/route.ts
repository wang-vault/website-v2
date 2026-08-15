import { z } from 'zod';
import { apiError, apiOk, handleApiError } from '@/lib/api';
import { requireAdmin, requireWriteSecurity } from '@/lib/api/guards';
import { assertPermission } from '@/lib/auth/rbac';
import { clientIp } from '@/lib/security/rate-limit';

const settingsSchema = z.object({
  siteName: z.string().trim().min(2).max(60).optional(),
  tagline: z.string().trim().max(120).optional(),
  siteDescription: z.string().trim().max(300).optional(),
  whatsappNumber: z.string().trim().regex(/^[0-9]{0,20}$/, 'Nomor WhatsApp hanya angka.').optional(),
  discordInviteUrl: z.string().trim().max(300).optional(),
  contactEmail: z.string().trim().email('Format email tidak valid.').or(z.literal('')).optional(),
  platformStatus: z.enum(['operational', 'degraded', 'outage', 'maintenance']).optional(),
  services: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(80),
        status: z.enum(['operational', 'degraded', 'outage', 'maintenance']),
        description: z.string().trim().max(300),
      }),
    )
    .max(30)
    .optional(),
  infrastructureNote: z.string().trim().max(2000).optional(),
  locations: z.array(z.string().trim().max(120)).max(50).optional(),
  paymentInstructions: z.string().trim().max(2000).optional(),
  announcementBanner: z.string().trim().max(500).optional(),
  // Maintenance (owner-only di bawah)
  maintenanceMode: z.boolean().optional(),
  maintenanceTitle: z.string().trim().max(160).optional(),
  maintenanceMessage: z.string().trim().max(2000).optional(),
  maintenanceEstimatedRestoration: z.string().trim().max(160).optional(),
  maintenanceAllowedPaths: z.array(z.string().trim().max(120)).max(30).optional(),
});

const MAINTENANCE_FIELDS = [
  'maintenanceMode',
  'maintenanceTitle',
  'maintenanceMessage',
  'maintenanceEstimatedRestoration',
  'maintenanceAllowedPaths',
] as const;

export async function GET(): Promise<Response> {
  try {
    const { db } = await requireAdmin('settings.manage');
    const settings = await db.settings.get();
    return apiOk(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

/** PUT /api/admin/settings — pengaturan platform. Mode maintenance: owner-only. */
export async function PUT(request: Request): Promise<Response> {
  try {
    const { db, session } = await requireAdmin('settings.manage');
    await requireWriteSecurity();
    const ip = await clientIp();

    const body: unknown = await request.json().catch(() => null);
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return apiError(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
    }

    const touchesMaintenance = MAINTENANCE_FIELDS.some((field) => field in parsed.data);
    if (touchesMaintenance) {
      assertPermission(session.role, 'maintenance.manage');
    }

    const updated = await db.settings.update(parsed.data);
    await db.audit.log({
      actorId: session.sub,
      actorEmail: session.email,
      action: 'update',
      resource: 'settings',
      resourceId: 'main',
      ipAddress: ip,
      metadata: { fields: Object.keys(parsed.data) },
    });
    return apiOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
