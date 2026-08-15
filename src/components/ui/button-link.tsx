import Link from 'next/link';
import type { AnchorHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonSize, ButtonVariant } from './button';

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-contrast hover:bg-text-secondary border border-transparent',
  secondary: 'bg-surface-muted text-text-primary hover:bg-surface border border-border',
  outline: 'bg-transparent text-text-primary border border-border hover:bg-surface-muted',
  ghost: 'bg-transparent text-text-primary hover:bg-surface-muted border border-transparent',
  danger: 'bg-error text-white hover:opacity-90 border border-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-sm',
};

/** Link yang ditampilkan seperti tombol — untuk navigasi yang valid secara semantik. */
export function ButtonLink({ href, variant = 'primary', size = 'md', className, children, ...props }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
