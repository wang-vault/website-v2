import type { ReactNode } from 'react';
import { Markdown } from '@/components/markdown';
import { Breadcrumb } from '@/components/ui/misc';

export function PageShell({
  eyebrow,
  title,
  description,
  breadcrumb,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumb: { label: string; href?: string }[];
  children: ReactNode;
}) {
  return (
    <div className="container-page py-10">
      <Breadcrumb items={breadcrumb} className="mb-6" />
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-text-secondary">{description}</p>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}

export function MarkdownPage({
  eyebrow,
  title,
  breadcrumb,
  content,
  updatedAt,
}: {
  eyebrow?: string;
  title: string;
  breadcrumb: { label: string; href?: string }[];
  content: string;
  updatedAt?: string;
}) {
  return (
    <PageShell eyebrow={eyebrow} title={title} breadcrumb={breadcrumb}>
      <Markdown content={content} />
      {updatedAt ? (
        <p className="mt-10 border-t border-border pt-4 text-xs text-text-muted">
          Terakhir diperbarui: {new Date(updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      ) : null}
    </PageShell>
  );
}
