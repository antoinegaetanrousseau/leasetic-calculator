/**
 * Phase 18 Plan 02 Task 2 — RecentActivityRow (D-06 / D-07).
 *
 * READ-ONLY activity row for the Admin Home Recent activity card.
 * NO onClick, NO hover affordance, NO row-level link (D-07). Avatar +
 * sentence + relative timestamp only.
 *
 * Server component (no interactivity needed). Consumes:
 *   - row: ActivityRow from src/lib/db/queries/admin-activity.ts (Plan 18-01)
 *   - lang: 'fr' | 'en'
 *
 * SECURITY (T-18-02-02): sentenceArgs are interpolated via plain string
 * replacement and rendered as React text children (auto-escaped). Avatar
 * initials are derived from actorName via getInitials and rendered as text
 * — no raw-HTML sinks.
 */
import type { ActivityRow } from '@/lib/db/queries/admin-activity';
import { t, type Lang } from '@/lib/i18n/dictionaries';

interface RecentActivityRowProps {
  row: ActivityRow;
  lang: Lang;
}

/**
 * Derive an avatar text label from actorName (preferred) or actorEmail
 * (fallback). Strategy:
 *   - Strip non-letter punctuation from words (e.g. "Jean-Luc" → 2 words
 *     "Jean" + "Luc" so we pick "J" + "L"), trim whitespace.
 *   - First letter of the first 2 words, uppercase.
 *   - 1-word name → single letter.
 *   - Empty / whitespace-only name → use first letter of actorEmail.
 *   - Both empty → '?'.
 */
export function getInitials(actorName?: string, actorEmail?: string): string {
  const trimmedName = (actorName ?? '').trim();
  if (trimmedName.length > 0) {
    // Split on whitespace only — compound first names like "Jean-Luc" stay
    // one word so the initial is "J". Multi-word last names "Marie Anne
    // Dubois" → take first 2 → "MA".
    const words = trimmedName.split(/\s+/).filter((w) => w.length > 0);
    if (words.length > 0) {
      const letters = words.slice(0, 2).map((w) => w.charAt(0).toUpperCase());
      // Strip non-letter characters (e.g. leading "(" or quote). Defensive
      // — production data should be clean but author display names from
      // the JOIN to users may include occasional unicode oddities.
      const joined = letters.join('').replace(/[^A-Z]/g, '');
      if (joined.length > 0) return joined;
    }
  }
  const trimmedEmail = (actorEmail ?? '').trim();
  if (trimmedEmail.length > 0) {
    return trimmedEmail.charAt(0).toUpperCase();
  }
  return '?';
}

/**
 * Format a Date relative to "now" using the Plan 18-01 i18n keys.
 * Bucket selection:
 *   <60min  → admin.home.activity.time.minutesAgo  ("Il y a {0} min" / "{0} min ago")
 *   <24h    → admin.home.activity.time.hoursAgo    ("Il y a {0}h"     / "{0}h ago")
 *   >=24h   → admin.home.activity.time.daysAgo     ("Il y a {0} jours"/ "{0} days ago")
 *
 * Negative / future timestamps (e.g. clock skew) collapse to "1 min" — we
 * never display a "in -N min" value.
 */
function relativeTime(date: Date, lang: Lang, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const safeDiffMs = Math.max(0, diffMs);
  const diffMinutes = Math.floor(safeDiffMs / (60 * 1000));
  if (diffMinutes < 60) {
    const n = Math.max(1, diffMinutes);
    return t('admin.home.activity.time.minutesAgo', lang).replace('{0}', String(n));
  }
  const diffHours = Math.floor(safeDiffMs / (60 * 60 * 1000));
  if (diffHours < 24) {
    return t('admin.home.activity.time.hoursAgo', lang).replace('{0}', String(diffHours));
  }
  const diffDays = Math.floor(safeDiffMs / (24 * 60 * 60 * 1000));
  return t('admin.home.activity.time.daysAgo', lang).replace('{0}', String(diffDays));
}

/**
 * Interpolate a sentence template using positional {N} placeholders.
 * Mirrors the convention already established in app/(authed)/page.tsx
 * and src/components/proposals/* (`t(key, lang).replace('{0}', value)`).
 * Iterating over sentenceArgs supports multi-placeholder sentences without
 * forcing callers to know the arity at the call site.
 */
function interpolateSentence(template: string, args: string[]): string {
  let result = template;
  args.forEach((arg, i) => {
    // Replace ALL occurrences of `{i}` — using split/join avoids regex escaping
    // headaches for arbitrary user-supplied strings (defense-in-depth even
    // though args are server-derived).
    result = result.split(`{${i}}`).join(arg);
  });
  return result;
}

export function RecentActivityRow({ row, lang }: RecentActivityRowProps) {
  const initials = getInitials(row.actorName, row.actorEmail);
  const sentenceTemplate = t(row.sentenceKey as Parameters<typeof t>[0], lang);
  const sentence = interpolateSentence(sentenceTemplate, row.sentenceArgs);
  const timeLabel = relativeTime(row.timestamp, lang);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
        // NO cursor:pointer (D-07 read-only).
      }}
    >
      {/* Avatar (left, 32px circle) — initials, gd-text background, white text */}
      <div
        data-testid="activity-avatar"
        aria-hidden="true"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '9999px',
          background: 'var(--gd-text)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12.5px',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      {/* Sentence (middle, flex:1) */}
      <div
        style={{
          flex: 1,
          fontSize: '14.5px',
          fontWeight: 400,
          color: 'var(--ink)',
          lineHeight: 1.55,
          minWidth: 0,
        }}
      >
        {sentence}
      </div>

      {/* Relative timestamp (right) */}
      <div
        style={{
          fontSize: '12.5px',
          fontWeight: 500,
          color: 'var(--muted)',
          flexShrink: 0,
        }}
      >
        {timeLabel}
      </div>
    </div>
  );
}
