'use client';

import { useId } from 'react';

export interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  description?: string;
}

export function SliderField({ label, value, min, max, step, unit, onChange, description }: SliderFieldProps) {
  const id = useId();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const parsed = Number(event.target.value);
    if (Number.isFinite(parsed)) onChange(parsed);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-text-primary">
          {label}
        </label>
        <output
          htmlFor={id}
          className="rounded-md bg-surface-muted px-2.5 py-1 font-mono text-sm font-semibold text-text-primary"
          aria-live="polite"
        >
          {value} {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="ws-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        aria-valuetext={`${value} ${unit}`}
      />
      <div className="flex justify-between text-xs text-text-muted" aria-hidden="true">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
      {description ? <p className="text-xs text-text-muted">{description}</p> : null}
    </div>
  );
}
