'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const ALLOWED_THEMES = ['light', 'dark', 'system'] as const;
type Theme = typeof ALLOWED_THEMES[number];

export async function setTheme(theme: Theme) {
  // Runtime guard against hostile callers (TypeScript narrowing is not enforced at the wire boundary).
  if (!ALLOWED_THEMES.includes(theme as Theme)) {
    return; // silently reject — no error surface
  }
  const c = await cookies();
  c.set('lt_theme', theme, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false, // client-side no-flash script needs to read it
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  revalidatePath('/');
}
