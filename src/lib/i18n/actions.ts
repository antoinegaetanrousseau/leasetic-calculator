'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import type { Lang } from './dictionaries';

const ALLOWED_LANGS = ['fr', 'en'] as const;

export async function setLang(lang: Lang) {
  // Runtime guard against hostile callers (TypeScript narrowing is not enforced at the wire boundary).
  // httpOnly: false is intentional — lt_lang is a non-sensitive UI preference cookie.
  if (!ALLOWED_LANGS.includes(lang as Lang)) {
    return;
  }
  const c = await cookies();
  c.set('lt_lang', lang, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });

  // D-27: when authenticated, also persist to users.language so the choice
  // survives logout/login on the same or another device.
  try {
    const session = await auth().api.getSession({ headers: await headers() });
    if (session) {
      await db()
        .update(schema.users)
        .set({ language: lang })
        .where(eq(schema.users.id, session.user.id));
    }
  } catch (e) {
    // Bounded redaction: log server-side, but never let DB write failure block
    // the cookie-only path (the user still gets the lang change in the UI).
    console.error('[setLang] DB persistence failed:', e);
  }

  revalidatePath('/');
}
