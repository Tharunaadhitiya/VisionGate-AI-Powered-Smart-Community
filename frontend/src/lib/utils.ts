import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  const intervals: [number, string][] = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count}${label} ago`;
  }
  return 'just now';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'badge-warning', approved: 'badge-info', checked_in: 'badge-success',
    checked_out: 'badge-neutral', rejected: 'badge-danger', denied: 'badge-danger',
    resolved: 'badge-success', in_progress: 'badge-warning', submitted: 'badge-info',
    new: 'badge-danger', acknowledged: 'badge-warning', paid: 'badge-success', overdue: 'badge-danger',
    confirmed: 'badge-success', cancelled: 'badge-danger', active: 'badge-success', inactive: 'badge-neutral',
  };
  return colors[status] || 'badge-neutral';
}

export function truncate(str: string, len = 50): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}
