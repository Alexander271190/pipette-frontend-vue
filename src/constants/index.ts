import type { Status, ResultType } from '@/types';

export const STATUS_LABELS: Record<Status, string> = {
  ok: 'В норме',
  warn: 'Скоро поверка',
  danger: 'Просрочена',
  inactive: 'Неактивна',
  sent: 'На поверке',
  fail: 'Брак',
  wip: 'В процессе',
  unknown: 'Не задано',
};

export const STATUS_ICONS: Record<Status, string> = {
  ok: 'fa-circle-check',
  warn: 'fa-clock',
  danger: 'fa-triangle-exclamation',
  inactive: 'fa-circle-pause',
  sent: 'fa-box',
  fail: 'fa-xmark',
  wip: 'fa-hourglass-half',
  unknown: 'fa-circle-question',
};

export const STATUS_COLORS: Record<Status, string> = {
  ok: '#16a34a',
  warn: '#eab308',
  danger: '#dc2626',
  inactive: '#94a3b8',
  sent: '#0ea5e9',
  fail: '#dc2626',
  wip: '#eab308',
  unknown: '#94a3b8',
};

export const RESULT_LABELS: Record<ResultType, string> = {
  pass: 'Годен',
  fail: 'Брак',
  wip: 'В процессе',
};

export const COLORS = {
  danger: '#dc2626',
  success: '#16a34a',
  warning: '#eab308',
  info: '#0ea5e9',
  primary: '#4f46e5',
  muted: '#64748b',
  faint: '#94a3b8',
};
