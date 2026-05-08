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
 * Password reset token redemption page.
 *
 * Same shape as invite/[token]/page.tsx but with kind='reset' and reset-specific
 * copy (auth.reset.title / auth.reset.subtitle).
 *
 * The 4-condition lookup (hash + kind + usedAt IS NULL + expiresAt > NOW) is
 * identical — kind='reset' in the WHERE clause prevents cross-kind token replay
 * (T-06-05-04 wrong-kind prevention).
 *
 * params is Promise<...> per PITFALLS §1.1 (Next.js 16 async params).
 */
export default async function ResetPage({ params }: PageProps) {
  const { token } = await params;
  const lang = await getCurrentLang();

  const tokenHash = hashToken(token);
  const record = await db().query.passwordResets.findFirst({
    where: and(
      eq(schema.passwordResets.tokenHash, tokenHash),
      eq(schema.passwordResets.kind, 'reset'),
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
        {t('auth.reset.title', lang)}
      </div>
      <div
        style={{
          fontSize: '14.5px',
          color: 'var(--muted)',
          marginBottom: 16,
        }}
      >
        {t('auth.reset.subtitle', lang)}
      </div>
      <SetPasswordForm token={token} kind="reset" lang={lang} />
    </div>
  );
}
