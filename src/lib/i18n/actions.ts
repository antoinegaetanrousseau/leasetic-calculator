'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
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
  revalidatePath('/');
}
