import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatArs(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPctFraction(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return '—';
  const pct = rate * 100;
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`;
}
