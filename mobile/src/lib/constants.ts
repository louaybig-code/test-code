import { TaskPriority } from '../types';
import { BRAND } from '../theme/tokens';

/**
 * PRIORITY_CONFIG — same semantic mapping as web `src/lib/constants.ts`,
 * with raw color values instead of Tailwind classes.
 */
export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; colorDark: string; bg: string; border: string; iconColor: string }
> = {
  LOW: {
    label: 'Low',
    color: '#6B7280',
    colorDark: '#8890A8',
    bg: 'rgba(107, 114, 128, 0.10)',
    border: 'rgba(107, 114, 128, 0.30)',
    iconColor: '#8890A8',
  },
  MEDIUM: {
    label: 'Medium',
    color: BRAND.teal,
    colorDark: BRAND.teal,
    bg: 'rgba(26, 140, 140, 0.10)',
    border: 'rgba(26, 140, 140, 0.30)',
    iconColor: BRAND.teal,
  },
  HIGH: {
    label: 'High',
    color: BRAND.orange,
    colorDark: BRAND.orange,
    bg: 'rgba(232, 83, 26, 0.10)',
    border: 'rgba(232, 83, 26, 0.30)',
    iconColor: BRAND.orange,
  },
  URGENT: {
    label: 'Urgent',
    color: '#F43F5E',
    colorDark: '#FB7185',
    bg: 'rgba(244, 63, 94, 0.10)',
    border: 'rgba(244, 63, 94, 0.30)',
    iconColor: '#F43F5E',
  },
};

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function getUserInitials(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  if (firstName) return firstName.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return 'U';
}

/** Relative timestamp helper used by notifications/messages (FR, same as web). */
export function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  return `Il y a ${Math.floor(hours / 24)}j`;
}
