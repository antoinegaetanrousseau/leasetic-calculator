/**
 * Password strength scoring + UI surface helpers.
 *
 * Extracted from src/components/SetPasswordForm.tsx in Phase 21 / Plan 21-01
 * (Task 3) so the new /parametres ParametresForm reuses the SAME scoring +
 * dict-key + color tables. Pure module — no framework imports, no I/O.
 *
 * Per UI-SPEC §Invite — 0–4 strength ladder:
 *   0 = empty
 *   1 = < 8 chars                      → "Faible" / red
 *   2 = ≥8 chars + number              → "Moyen" / orange
 *   3 = ≥8 chars + number + upper      → "Fort" / teal
 *   4 = ≥12 chars + number + upper + symbol → "Très fort" / gold
 */
import type { DictKey } from '@/lib/i18n/dictionaries';

export function strengthScore(pwd: string): 0 | 1 | 2 | 3 | 4 {
  if (!pwd) return 0;
  const hasMinLength = pwd.length >= 8;
  if (!hasMinLength) return 1;
  const hasNumber = /\d/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLongAndSymbol = pwd.length >= 12 && /[^A-Za-z0-9]/.test(pwd);
  if (hasNumber && hasUpper && hasLongAndSymbol) return 4;
  if (hasNumber && hasUpper) return 3;
  if (hasNumber) return 2;
  return 1;
}

export const STRENGTH_KEYS: Record<0 | 1 | 2 | 3 | 4, DictKey> = {
  0: 'auth.password.strength.weak',
  1: 'auth.password.strength.weak',
  2: 'auth.password.strength.medium',
  3: 'auth.password.strength.strong',
  4: 'auth.password.strength.very_strong',
};

export const STRENGTH_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'var(--border)',
  1: 'var(--danger)',
  2: '#e08530',
  3: 'var(--teal)',
  4: 'var(--gd)',
};
