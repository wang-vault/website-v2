'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ items, defaultKey }: { items: TabItem[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? items[0]?.key ?? '');
  const current = items.find((item) => item.key === active) ?? items[0];

  return (
    <div>
      <div role="tablist" aria-label="Navigasi tab" className="flex gap-1 overflow-x-auto border-b border-border">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`tab-${item.key}`}
            aria-selected={current?.key === item.key}
            aria-controls={`tabpanel-${item.key}`}
            onClick={() => setActive(item.key)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              current?.key === item.key
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {current ? (
        <div
          role="tabpanel"
          id={`tabpanel-${current.key}`}
          aria-labelledby={`tab-${current.key}`}
          className="pt-4"
        >
          {current.content}
        </div>
      ) : null}
    </div>
  );
}
