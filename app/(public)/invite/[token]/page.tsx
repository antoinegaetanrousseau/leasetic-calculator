import { and, eq, gt, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { db, schema } from '@/lib/db';
import { hashToken } from '@/lib/auth/tokens';
import { getCurrentLang, t } from '@/lib/i18n';
import { SetPasswordForm } from '@/components/SetPasswordForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Invitation token redemption page.
 *
 * Server-side token lookup with all 4 guards (D-09 / T-06-05-03 / T-06-05-04):
 *  1. tokenHash = sha256(plaintext) — stored hash matches
 *  2. kind = 'invite' — wrong-kind prevention
 *  3. usedAt IS NULL — single-use enforcement
 *  4. expiresAt > NOW — TTL enforcement
 *
 * If any condition fails → show the expired-token card (NOT a notFound/404 —
 * that would leak information about valid vs invalid tokens via response code).
 * Same "Lien invalide ou expiré" message for all failure modes (anti-enumeration).
 *
 * params is Promise<...> per PITFALLS §1.1 (Next.js 16 async params).
 */
export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const lang = await getCurrentLang();

  const tokenHash = hashToken(token);
  const record = await db().query.passwordResets.findFirst({
    where: and(
      eq(schema.passwordResets.tokenHash, tokenHash),
      eq(schema.passwordResets.kind, 'invite'),
      isNull(schema.passwordResets.usedAt),
      gt(schema.passwordResets.expiresAt, new Date()),
    ),
  });

  if (!record) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          padding: 28,
          background: 'var(--surface)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-card)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '16.5px',
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 12,
            marginTop: 0,
          }}
        >
          {t('auth.token.invalid.title', lang)}
        </h1>
        <p
          style={{
            fontSize: '14.5px',
            color: 'var(--muted)',
            marginBottom: 24,
          }}
        >
          {t('auth.token.invalid.body', lang)}
        </p>
        <Link
          href="/login"
          className="btn-out"
          style={{
            display: 'inline-block',
            borderRadius: 9999,
            padding: '0.6rem 1.5rem',
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--navy)',
            background: 'transparent',
            border: '1px solid var(--navy)',
            textDecoration: 'none',
          }}
        >
          {t('auth.button.back.signin', lang)}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
      <div
        style={{
          textTransform: 'uppercase',
          fontSize: '11.8px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: 'var(--muted)',
          marginBottom: 8,
        }}
      >
        {t('auth.invite.title', lang)}
      </div>
      <div
        style={{
          fontSize: '14.5px',
          color: 'var(--muted)',
          marginBottom: 16,
        }}
      >
        {t('auth.invite.subtitle', lang)}
      </div>
      <SetPasswordForm token={token} kind="invite" lang={lang} />
    </div>
  );
}
