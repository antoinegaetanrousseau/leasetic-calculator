'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, schema } from '@/lib/db';

const ALLOWED_THEMES = ['light', 'dark', 'system'] as const;
type Theme = (typeof ALLOWED_THEMES)[number];

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

  // D-27: when authenticated, also persist to users.theme so the choice
  // survives logout/login on the same or another device.
  try {
    const session = await auth().api.getSession({ headers: await headers() });
    if (session) {
      await db()
        .update(schema.users)
        .set({ theme })
        .where(eq(schema.users.id, session.user.id));
    }
  } catch (e) {
    // Bounded redaction: log server-side, but never let DB write failure block
    // the cookie-only path (the user still gets the theme change in the UI).
    console.error('[setTheme] DB persistence failed:', e);
  }

  revalidatePath('/');
}
