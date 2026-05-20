import { formatDate } from '@/lib/i18n/format';
import { t, type Lang } from '@/lib/i18n/dictionaries';

/**
 * UI-SPEC §3.2.4 — relative-time bucket for the last_login column. Pure function;
 * caller passes a stable nowMs to avoid Date.now() drift inside React renders.
 *
 *  < 1 min      → "À l'instant" / "Just now"
 *  < 1 h        → "Il y a {N} min" / "{N} min ago"
 *  < 24 h       → "Il y a {N}h" / "{N}h ago"
 *  < 30 days    → "Il y a {N} jours" / "{N} days ago"
 *  >= 30 days   → formatDate(value, lang)
 */
export function timeAgo(value: Date | null, lang: Lang, nowMs: number): string {
  if (!value) return '—';
  const diffMs = nowMs - value.getTime();
  if (diffMs < 0) {
    return formatDate(value, lang, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) {
    return t('admin.accounts.last_login.just_now', lang);
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return t('admin.accounts.last_login.minutes_ago', lang).replace('{0}', String(min));
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return t('admin.accounts.last_login.hours_ago', lang).replace('{0}', String(hr));
  }
  const day = Math.floor(hr / 24);
  if (day < 30) {
    return t('admin.accounts.last_login.days_ago', lang).replace('{0}', String(day));
  }
  return formatDate(value, lang, { year: 'numeric', month: 'short', day: 'numeric' });
}
