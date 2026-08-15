import type { Metadata } from 'next';
import { Star, Quote } from 'lucide-react';
import { getDb } from '@/lib/db';
import { PageShell } from '@/components/layout/page-shell';
import { EmptyState } from '@/components/ui/state';

export const metadata: Metadata = {
  title: 'Testimoni',
  description: 'Testimoni pelanggan WangStore.',
};

export default async function TestimonialsPage() {
  const db = await getDb();
  const testimonials = await db.testimonials.list({ activeOnly: true });

  return (
    <div className="container-page py-10">
      <PageShell
        eyebrow="Pelanggan"
        title="Testimoni"
        description="Kata pelanggan tentang pengalaman mereka menggunakan WangStore. Testimoni yang ditampilkan berasal dari pelanggan asli."
        breadcrumb={[{ label: 'Beranda', href: '/' }, { label: 'Testimoni' }]}
      >
        {testimonials.length === 0 ? (
          <EmptyState
            title="Belum ada testimoni"
            description="WangStore baru memulai perjalanannya. Testimoni akan ditampilkan di sini setelah pelanggan memberikan ulasan mereka — kami tidak membuat testimoni palsu."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.id} className="rounded-lg border border-border bg-surface p-5">
                <Quote className="h-4 w-4 text-text-muted" aria-hidden="true" />
                <blockquote className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {testimonial.content}
                </blockquote>
                <figcaption className="mt-4 border-t border-border pt-3">
                  <p className="text-sm font-semibold text-text-primary">{testimonial.name}</p>
                  <p className="text-xs text-text-muted">{testimonial.role}</p>
                  {testimonial.rating !== null ? (
                    <div className="mt-1 flex gap-0.5" aria-label={`Rating ${testimonial.rating} dari 5`}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          className={
                            index < (testimonial.rating ?? 0)
                              ? 'h-3.5 w-3.5 fill-warning text-warning'
                              : 'h-3.5 w-3.5 text-border'
                          }
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </PageShell>
    </div>
  );
}
