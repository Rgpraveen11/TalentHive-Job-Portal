import { formatDistanceToNow, format } from 'date-fns';

export const timeAgo = (date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatDate = (date, fmt = 'MMM d, yyyy') =>
  format(new Date(date), fmt);

export const formatSalary = (salary) => {
  if (!salary) return 'Not specified';
  if (!salary.isPublic) return 'Competitive';
  const fmt = (n) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  const sym = salary.currency === 'USD' ? '$'
            : salary.currency === 'EUR' ? '€'
            : salary.currency === 'GBP' ? '£'
            : `${salary.currency} `;
  if (!salary.min && !salary.max) return 'Not specified';
  if (!salary.max) return `${sym}${fmt(salary.min)}+`;
  return `${sym}${fmt(salary.min)} – ${sym}${fmt(salary.max)}`;
};

export const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export const statusColor = (status) => {
  const map = {
    applied:     'badge-purple',
    reviewing:   'badge-yellow',
    shortlisted: 'badge-green',
    interview:   'badge-green',
    offered:     'badge-green',
    rejected:    'badge-red',
    withdrawn:   'badge-slate',
    active:      'badge-green',
    closed:      'badge-slate',
    flagged:     'badge-red',
    draft:       'badge-yellow',
  };
  return map[status] || 'badge-slate';
};

export const matchColor = (score) => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
};

export const truncate = (str, n = 120) =>
  str?.length > n ? str.slice(0, n) + '…' : str;