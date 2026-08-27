import { TaskPriority } from '../types';

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; bg: string; border: string; iconColor: string }
> = {
  LOW: {
    label: 'Low',
    color: 'text-[#6B7280] dark:text-[#8890A8]',
    bg: 'bg-[#6B7280]/10',
    border: 'border-[#6B7280]/30',
    iconColor: '#8890A8',
  },
  MEDIUM: {
    label: 'Medium',
    color: 'text-[#1A8C8C]',
    bg: 'bg-[#1A8C8C]/10',
    border: 'border-[#1A8C8C]/30',
    iconColor: '#1A8C8C',
  },
  HIGH: {
    label: 'High',
    color: 'text-[#E8531A]',
    bg: 'bg-[#E8531A]/10',
    border: 'border-[#E8531A]/30',
    iconColor: '#E8531A',
  },
  URGENT: {
    label: 'Urgent',
    color: 'text-rose-500 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    iconColor: '#f43f5e',
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
