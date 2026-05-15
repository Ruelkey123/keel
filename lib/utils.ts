import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100)
}

export function formatDateRange(start: string, end: string): string {
  const s = parseISO(start)
  const e = parseISO(end)
  if (format(s, 'yyyy-MM-dd') === format(e, 'yyyy-MM-dd')) {
    return `${format(s, 'MMM d, yyyy')} · ${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`
  }
  return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
}

export function formatRelative(date: string): string {
  return formatDistanceToNow(parseISO(date), { addSuffix: true })
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function hoursFromMs(ms: number): number {
  return ms / (1000 * 60 * 60)
}
