import { z } from 'zod';
import { getDb } from '@/lib/db';
import { ApiErrorException } from '@/lib/api';
import { generateId } from '@/lib/utils';
import type { Permission } from '@/lib/auth/rbac';
import type {
  AnnouncementRecord,
  BlogCategoryRecord,
  BlogPostRecord,
  FaqItemRecord,
  IncidentRecord,
  KnowledgeArticleRecord,
  LegalDocumentRecord,
  MaintenanceWindowRecord,
  CmsPageRecord,
  TestimonialRecord,
} from '@/types';

/**
 * GENERIC CMS API — satu resource handler dengan resource map.
 *
 * Seluruh modul konten admin melewati handler ini (routes
 * /api/admin/cms/[resource] dan /api/admin/cms/[resource]/[id]) dengan
 * resource map yang menentukan collection, identity field, allowed fields,
 * validation schema, dan minimum role. Tidak ada 20 endpoint duplikat.
 */

export type CmsResourceName =
  | 'blog'
  | 'blogCategories'
  | 'knowledgeBase'
  | 'faq'
  | 'testimonials'
  | 'pages'
  | 'legal'
  | 'announcements'
  | 'incidents'
  | 'maintenanceWindows';

export interface CmsResourceDefinition {
  /** Izin minimum untuk MEMBACA resource (staff mendapat akses baca konten). */
  readPermission: Permission;
  /** Izin minimum untuk MENULIS (create/update/delete) resource. */
  writePermission: Permission;
  idField: string;
  allowedFields: string[];
  validation: z.ZodType<Record<string, unknown>>;
}

export const CMS_RESOURCE_MAP: Record<CmsResourceName, CmsResourceDefinition> = {
  blog: {
    readPermission: 'content.read',
    writePermission: 'content.manage',
    idField: 'id',
    allowedFields: ['slug', 'title', 'excerpt', 'content', 'categoryId', 'tags', 'author', 'status', 'publishedAt'],
    validation: z.object({
      slug: z.string().trim().min(2).max(160),
      title: z.string().trim().min(3).max(200),
      excerpt: z.string().trim().max(500),
      content: z.string().max(500_000),
      categoryId: z.string().max(80).nullable(),
      tags: z.array(z.string().max(40)).max(20),
      author: z.string().trim().min(2).max(80),
      status: z.enum(['draft', 'published']),
      publishedAt: z.string().nullable(),
    }),
  },
  blogCategories: {
    readPermission: 'content.read',
    writePermission: 'content.manage',
    idField: 'id',
    allowedFields: ['slug', 'name', 'description'],
    validation: z.object({
      slug: z.string().trim().min(2).max(80),
      name: z.string().trim().min(2).max(80),
      description: z.string().trim().max(500),
    }),
  },
  knowledgeBase: {
    readPermission: 'content.read',
    writePermission: 'content.manage',
    idField: 'id',
    allowedFields: ['slug', 'title', 'excerpt', 'content', 'category', 'tags', 'status', 'publishedAt'],
    validation: z.object({
      slug: z.string().trim().min(2).max(160),
      title: z.string().trim().min(3).max(200),
      excerpt: z.string().trim().max(500),
      content: z.string().max(500_000),
      category: z.string().trim().min(2).max(80),
      tags: z.array(z.string().max(40)).max(20),
      status: z.enum(['draft', 'published']),
      publishedAt: z.string().nullable(),
    }),
  },
  faq: {
    readPermission: 'content.read',
    writePermission: 'content.manage',
    idField: 'id',
    allowedFields: ['question', 'answer', 'category', 'sortOrder', 'active'],
    validation: z.object({
      question: z.string().trim().min(5).max(300),
      answer: z.string().trim().min(5).max(10_000),
      category: z.string().trim().min(2).max(80),
      sortOrder: z.number().int().min(0).max(10_000),
      active: z.boolean(),
    }),
  },
  testimonials: {
    readPermission: 'content.read',
    writePermission: 'content.manage',
    idField: 'id',
    allowedFields: ['name', 'role', 'content', 'rating', 'active'],
    validation: z.object({
      name: z.string().trim().min(2).max(80),
      role: z.string().trim().max(120),
      content: z.string().trim().min(10).max(2_000),
      rating: z.number().int().min(1).max(5).nullable(),
      active: z.boolean(),
    }),
  },
  pages: {
    readPermission: 'content.read',
    writePermission: 'content.manage',
    idField: 'id',
    allowedFields: ['slug', 'title', 'content', 'metaTitle', 'metaDescription'],
    validation: z.object({
      slug: z.string().trim().min(2).max(80),
      title: z.string().trim().min(2).max(160),
      content: z.string().max(500_000),
      metaTitle: z.string().trim().max(160),
      metaDescription: z.string().trim().max(300),
    }),
  },
  legal: {
    readPermission: 'content.read',
    writePermission: 'legal.manage',
    idField: 'id',
    allowedFields: ['slug', 'title', 'content', 'version', 'publishedAt'],
    validation: z.object({
      slug: z.string().trim().min(2).max(80),
      title: z.string().trim().min(2).max(160),
      content: z.string().max(500_000),
      version: z.string().trim().max(20),
      publishedAt: z.string().nullable(),
    }),
  },
  announcements: {
    readPermission: 'content.read',
    writePermission: 'content.manage',
    idField: 'id',
    allowedFields: ['title', 'message', 'active', 'startsAt', 'endsAt'],
    validation: z.object({
      title: z.string().trim().min(3).max(160),
      message: z.string().trim().min(3).max(2_000),
      active: z.boolean(),
      startsAt: z.string().nullable(),
      endsAt: z.string().nullable(),
    }),
  },
  incidents: {
    readPermission: 'status.read',
    writePermission: 'status.manage',
    idField: 'id',
    allowedFields: ['title', 'description', 'status', 'severity', 'affectedServices', 'startedAt', 'resolvedAt', 'updates'],
    validation: z.object({
      title: z.string().trim().min(3).max(160),
      description: z.string().trim().min(3).max(5_000),
      status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
      severity: z.enum(['none', 'minor', 'major', 'critical']),
      affectedServices: z.array(z.string().max(80)).max(50),
      startedAt: z.string(),
      resolvedAt: z.string().nullable(),
      updates: z.array(
        z.object({
          id: z.string(),
          message: z.string().max(2_000),
          status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
          createdAt: z.string(),
        }),
      ),
    }),
  },
  maintenanceWindows: {
    readPermission: 'status.read',
    writePermission: 'status.manage',
    idField: 'id',
    allowedFields: ['title', 'description', 'status', 'affectedServices', 'startsAt', 'endsAt'],
    validation: z.object({
      title: z.string().trim().min(3).max(160),
      description: z.string().trim().min(3).max(5_000),
      status: z.enum(['scheduled', 'active', 'completed', 'cancelled']),
      affectedServices: z.array(z.string().max(80)).max(50),
      startsAt: z.string(),
      endsAt: z.string(),
    }),
  },
};

export const CMS_RESOURCE_NAMES = Object.keys(CMS_RESOURCE_MAP) as CmsResourceName[];

function isResourceName(value: string): value is CmsResourceName {
  return value in CMS_RESOURCE_MAP;
}

export function getResourceDefinition(resource: string): CmsResourceDefinition {
  if (!isResourceName(resource)) {
    throw new ApiErrorException(404, 'UNKNOWN_RESOURCE', 'Resource tidak dikenal.');
  }
  return CMS_RESOURCE_MAP[resource];
}

function toIso(): string {
  return new Date().toISOString();
}

function cmsId(resource: string): string {
  return generateId(resource.slice(0, 4));
}

function parseData(
  resource: CmsResourceName,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const def = CMS_RESOURCE_MAP[resource];
  const parsed = def.validation.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ApiErrorException(422, 'VALIDATION_ERROR', first ? first.message : 'Data tidak valid.');
  }
  return parsed.data;
}

export async function cmsList(resource: string): Promise<unknown[]> {
  const def = getResourceDefinition(resource);
  void def;
  const db = await getDb();
  const name = resource as CmsResourceName;
  switch (name) {
    case 'blog':
      return db.blog.listAll();
    case 'blogCategories':
      return db.blog.categories();
    case 'knowledgeBase':
      return db.knowledgeBase.listAll();
    case 'faq':
      return db.faq.list({ activeOnly: false });
    case 'testimonials':
      return db.testimonials.list({ activeOnly: false });
    case 'pages':
      return db.cmsPages.list();
    case 'legal':
      return db.legal.list();
    case 'announcements':
      return db.announcements.list();
    case 'incidents':
      return db.incidents.list();
    case 'maintenanceWindows':
      return db.maintenance.list();
  }
}

export async function cmsCreate(
  resource: string,
  input: Record<string, unknown>,
  actorEmail: string,
): Promise<unknown> {
  const name = resource as CmsResourceName;
  const def = getResourceDefinition(resource);
  const data = parseData(name, input);
  const id = def.idField === 'slug' ? String(data.slug) : cmsId(name);
  const now = toIso();
  const db = await getDb();

  let saved: unknown = null;
  switch (name) {
    case 'blog': {
      const record = { ...data, id, createdAt: now, updatedAt: now } as unknown as BlogPostRecord;
      await db.blog.create(record);
      saved = record;
      break;
    }
    case 'blogCategories': {
      const record = { ...data, id } as unknown as BlogCategoryRecord;
      await db.blog.upsertCategory(record);
      saved = record;
      break;
    }
    case 'knowledgeBase': {
      const record = { ...data, id, createdAt: now, updatedAt: now } as unknown as KnowledgeArticleRecord;
      await db.knowledgeBase.create(record);
      saved = record;
      break;
    }
    case 'faq': {
      const record = { ...data, id } as unknown as FaqItemRecord;
      await db.faq.create(record);
      saved = record;
      break;
    }
    case 'testimonials': {
      const record = { ...data, id, createdAt: now } as unknown as TestimonialRecord;
      await db.testimonials.create(record);
      saved = record;
      break;
    }
    case 'pages': {
      const record = { ...data, id, updatedAt: now } as unknown as CmsPageRecord;
      await db.cmsPages.upsert(record);
      saved = record;
      break;
    }
    case 'legal': {
      const record = { ...data, id, updatedAt: now } as unknown as LegalDocumentRecord;
      await db.legal.upsert(record);
      saved = record;
      break;
    }
    case 'announcements': {
      const record = { ...data, id, createdAt: now } as unknown as AnnouncementRecord;
      await db.announcements.upsert(record);
      saved = record;
      break;
    }
    case 'incidents': {
      const record = { ...data, id, createdAt: now, updatedAt: now } as unknown as IncidentRecord;
      await db.incidents.create(record);
      saved = record;
      break;
    }
    case 'maintenanceWindows': {
      const record = { ...data, id, createdAt: now, updatedAt: now } as unknown as MaintenanceWindowRecord;
      await db.maintenance.upsert(record);
      saved = record;
      break;
    }
  }

  await db.audit.log({
    actorId: null,
    actorEmail,
    action: 'create',
    resource: name,
    resourceId: id,
    ipAddress: null,
    metadata: { fields: Object.keys(data) },
  });
  return saved;
}

export async function cmsUpdate(
  resource: string,
  id: string,
  input: Record<string, unknown>,
  actorEmail: string,
): Promise<unknown> {
  const name = resource as CmsResourceName;
  const def = getResourceDefinition(resource);
  void def;
  const data = parseData(name, input);
  const now = toIso();
  const db = await getDb();

  let saved: unknown = null;
  switch (name) {
    case 'blog':
      saved = await db.blog.update(id, { ...data, updatedAt: now } as unknown as Partial<BlogPostRecord>);
      break;
    case 'blogCategories': {
      const record = { ...data, id } as unknown as BlogCategoryRecord;
      await db.blog.upsertCategory(record);
      saved = record;
      break;
    }
    case 'knowledgeBase':
      saved = await db.knowledgeBase.update(id, { ...data, updatedAt: now } as unknown as Partial<KnowledgeArticleRecord>);
      break;
    case 'faq':
      saved = await db.faq.update(id, data as unknown as Partial<FaqItemRecord>);
      break;
    case 'testimonials':
      saved = await db.testimonials.update(id, data as unknown as Partial<TestimonialRecord>);
      break;
    case 'pages': {
      const record = { ...data, id, updatedAt: now } as unknown as CmsPageRecord;
      await db.cmsPages.upsert(record);
      saved = record;
      break;
    }
    case 'legal': {
      const record = { ...data, id, updatedAt: now } as unknown as LegalDocumentRecord;
      await db.legal.upsert(record);
      saved = record;
      break;
    }
    case 'announcements': {
      const record = { ...data, id } as unknown as AnnouncementRecord;
      await db.announcements.upsert(record);
      saved = record;
      break;
    }
    case 'incidents':
      saved = await db.incidents.update(id, { ...data, updatedAt: now } as unknown as Partial<IncidentRecord>);
      break;
    case 'maintenanceWindows': {
      const record = { ...data, id, updatedAt: now } as unknown as MaintenanceWindowRecord;
      await db.maintenance.upsert(record);
      saved = record;
      break;
    }
  }

  await db.audit.log({
    actorId: null,
    actorEmail,
    action: 'update',
    resource: name,
    resourceId: id,
    ipAddress: null,
    metadata: { fields: Object.keys(data) },
  });
  return saved;
}

export async function cmsDelete(resource: string, id: string, actorEmail: string): Promise<void> {
  const name = resource as CmsResourceName;
  getResourceDefinition(resource);
  const db = await getDb();

  switch (name) {
    case 'blog':
      await db.blog.remove(id);
      break;
    case 'blogCategories':
      await db.blog.removeCategory(id);
      break;
    case 'knowledgeBase':
      await db.knowledgeBase.remove(id);
      break;
    case 'faq':
      await db.faq.remove(id);
      break;
    case 'testimonials':
      await db.testimonials.remove(id);
      break;
    case 'incidents':
      await db.incidents.remove(id);
      break;
    case 'maintenanceWindows':
      await db.maintenance.remove(id);
      break;
    default:
      throw new ApiErrorException(400, 'NOT_DELETABLE', 'Resource ini tidak dapat dihapus.');
  }

  await db.audit.log({
    actorId: null,
    actorEmail,
    action: 'delete',
    resource: name,
    resourceId: id,
    ipAddress: null,
    metadata: {},
  });
}
