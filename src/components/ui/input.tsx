import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-text-primary">
          {label}
          {required ? (
            <span className="ml-0.5 text-error" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      <div id={id} className="contents">
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-error">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const baseInputClasses =
  'w-full rounded-md border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-text-muted disabled:opacity-60 disabled:cursor-not-allowed';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(baseInputClasses, 'h-10', invalid && 'border-error', className)}
      {...props}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(baseInputClasses, 'min-h-[96px] py-2', invalid && 'border-error', className)}
      {...props}
    />
  );
});

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  invalid?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, invalid, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(baseInputClasses, 'h-10 appearance-none pr-8 bg-no-repeat bg-[right_0.75rem_center]', 'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2716%27%20height%3D%2716%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23666%27%20stroke-width%3D%272%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27%2F%3E%3C%2Fsvg%3E")]', invalid && 'border-error', className)}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
}

function Checkbox({ className, label, ...props }: CheckboxProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-start gap-2.5 text-sm text-text-secondary', className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border text-accent accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        {...props}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}

export interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
}

function Switch({ className, label, ...props }: SwitchProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-sm text-text-secondary', className)}>
      <span className="relative inline-flex">
        <input type="checkbox" role="switch" className="peer sr-only" {...props} />
        <span
          aria-hidden="true"
          className="h-5 w-9 rounded-full border border-border bg-surface-muted transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-4"
        />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}

export { Input, Textarea, Select, Checkbox, Switch };
