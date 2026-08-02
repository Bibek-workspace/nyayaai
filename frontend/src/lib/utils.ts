// Small shared utilities. The `cn` helper is the standard Tailwind merge trick
// (clsx + tailwind-merge) so component variants don't collide.

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { CaseStatus, UserRole } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string, pattern = 'dd MMM yyyy') {
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string) {
  return formatDate(iso, 'dd MMM yyyy, HH:mm');
}

export function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ── Domain-specific styling helpers ────────────────────────
export const statusLabels: Record<CaseStatus, string> = {
  filed: 'Filed',
  registered: 'Registered',
  notice_issued: 'Notice Issued',
  pleadings: 'Pleadings',
  evidence: 'Evidence',
  arguments: 'Arguments',
  judgment_reserved: 'Judgment Reserved',
  disposed: 'Disposed',
  appealed: 'Appealed',
};

export const statusColors: Record<CaseStatus, string> = {
  filed: 'bg-info/15 text-info border-info/30',
  registered: 'bg-info/15 text-info border-info/30',
  notice_issued: 'bg-gold/15 text-gold border-gold/30',
  pleadings: 'bg-gold/15 text-gold border-gold/30',
  evidence: 'bg-gold-2/15 text-gold-2 border-gold-2/30',
  arguments: 'bg-accent/15 text-accent border-accent/30',
  judgment_reserved: 'bg-accent/15 text-accent border-accent/30',
  disposed: 'bg-success/15 text-success border-success/30',
  appealed: 'bg-danger/15 text-danger border-danger/30',
};

export const roleLabels: Record<UserRole, string> = {
  judge: 'Judge',
  lawyer: 'Lawyer',
  litigant: 'Litigant',
  clerk: 'Clerk',
  prosecutor: 'Prosecutor',
  admin: 'Administrator',
};

export const roleIcons: Record<UserRole, string> = {
  judge: '⚖️',
  lawyer: '👨‍💼',
  litigant: '👤',
  clerk: '📋',
  prosecutor: '👮',
  admin: '🔧',
};
