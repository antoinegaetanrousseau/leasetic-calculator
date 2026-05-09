'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Search,
  Ban,
  CheckCircle2,
  Send,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import { formatDate } from '@/lib/i18n/format';
import {
  adminDisableUser,
  adminReEnableUser,
  adminCreatePasswordReset,
  adminReissueInvitation,
} from '@/lib/admin';
import type { PartnerWithCount } from '@/lib/db/queries/users';
import { InviteUrlModal } from '@/components/InviteUrlModal';
import type { RedeemKind } from '@/lib/auth/redeem';
import { CreatePartnerModal } from './CreatePartnerModal';
import { timeAgo } from './timeAgo';

export interface AccountsListProps {
  lang: Lang;
  initialPartners: PartnerWithCount[];
  nowMs: number;
}

interface InviteUrlPayload {
  url: string;
  kind: RedeemKind;
}

export function AccountsList({ lang, initialPartners, nowMs }: AccountsListProps) {
  const router = useRouter();
  const [partners] = useState<PartnerWithCount[]>(initialPartners);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<InviteUrlPayload | null>(null);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const createBtnRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return partners;
    const q = searchTerm.trim().toLowerCase();
    return partners.filter(
      (p) =>
        p.email.toLowerCase().includes(q) ||
        (p.displayName ?? p.name ?? '').toLowerCase().includes(q),
    );
  }, [partners, searchTerm]);

  const refreshAfterAction = () => {
    // Defer to router.refresh — re-runs page server component for fresh partners list.
    startTransition(() => router.refresh());
  };

  /* ── Disable / Re-enable: sonner confirm-toast pattern (UI-SPEC §4.3) ───── */
  const onDisable = (p: PartnerWithCount) => {
    const displayName = p.displayName ?? p.name ?? p.email;
    toast(
      t('admin.accounts.toast.disable.confirm', lang).replace('{0}', displayName),
      {
        duration: 6000,
        action: {
          label: t('admin.coefficients.modal.confirm', lang),
          onClick: async () => {
            setBusyRow(p.id);
            try {
              await adminDisableUser(p.id);
              toast.success(
                t('admin.accounts.toast.disable.success', lang).replace('{0}', displayName),
              );
              refreshAfterAction();
            } catch {
              toast.error(t('admin.accounts.toast.disable.error', lang));
            } finally {
              setBusyRow(null);
            }
          },
        },
        cancel: {
          label: t('admin.coefficients.modal.cancel', lang),
          onClick: () => {
            /* no-op — toast auto-dismisses */
          },
        },
      },
    );
  };

  const onReEnable = (p: PartnerWithCount) => {
    const displayName = p.displayName ?? p.name ?? p.email;
    toast(
      t('admin.accounts.toast.enable.confirm', lang).replace('{0}', displayName),
      {
        duration: 6000,
        action: {
          label: t('admin.coefficients.modal.confirm', lang),
          onClick: async () => {
            setBusyRow(p.id);
            try {
              await adminReEnableUser(p.id);
              toast.success(
                t('admin.accounts.toast.enable.success', lang).replace('{0}', displayName),
              );
              refreshAfterAction();
            } catch {
              toast.error(t('admin.accounts.toast.enable.error', lang));
            } finally {
              setBusyRow(null);
            }
          },
        },
        cancel: {
          label: t('admin.coefficients.modal.cancel', lang),
          onClick: () => {
            /* no-op */
          },
        },
      },
    );
  };

  /* ── Re-issue invitation ──────────────────────────────────────────────── */
  const onReissue = async (p: PartnerWithCount) => {
    setBusyRow(p.id);
    try {
      const result = await adminReissueInvitation({
        email: p.email,
        displayName: p.displayName ?? p.name ?? p.email,
        language: (p.language === 'en' ? 'en' : 'fr') as 'fr' | 'en',
      });
      toast.success(t('admin.accounts.toast.reissue.success', lang));
      setInviteUrl({ url: result.url, kind: 'invite' });
    } catch {
      toast.error(t('admin.accounts.toast.reissue.error', lang));
    } finally {
      setBusyRow(null);
    }
  };

  /* ── Send password reset ──────────────────────────────────────────────── */
  const onResetPassword = async (p: PartnerWithCount) => {
    setBusyRow(p.id);
    try {
      const result = await adminCreatePasswordReset(p.id);
      toast.success(t('admin.accounts.toast.reset.success', lang));
      setInviteUrl({ url: result.url, kind: 'reset' });
    } catch {
      toast.error(t('admin.accounts.toast.reset.error', lang));
    } finally {
      setBusyRow(null);
    }
  };

  /* ── Empty states ─────────────────────────────────────────────────────── */
  if (partners.length === 0) {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            ref={createBtnRef}
            type="button"
            className="btn-green"
            onClick={() => setShowCreate(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <UserPlus size={16} strokeWidth={1.6} aria-hidden="true" />
            {t('admin.accounts.create.btn', lang)}
          </button>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Users
            size={40}
            strokeWidth={1.4}
            color="var(--muted)"
            aria-hidden="true"
            style={{ opacity: 0.5 }}
          />
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--ink)',
              marginTop: 12,
            }}
          >
            {t('admin.accounts.empty.title', lang)}
          </p>
          <p
            style={{
              fontSize: 14,
              color: 'var(--muted)',
              marginTop: 6,
              marginBottom: 16,
            }}
          >
            {t('admin.accounts.empty.body', lang)}
          </p>
        </div>
        {showCreate && (
          <CreatePartnerModal
            lang={lang}
            onClose={() => setShowCreate(false)}
            onCreated={(url) => {
              setShowCreate(false);
              setInviteUrl({ url, kind: 'invite' });
              refreshAfterAction();
            }}
          />
        )}
        {inviteUrl && (
          <InviteUrlModal
            url={inviteUrl.url}
            kind={inviteUrl.kind}
            lang={lang}
            onClose={() => setInviteUrl(null)}
            triggerRef={createBtnRef}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}
      >
        <div
          className="search-bar"
          style={{ flex: 1, position: 'relative' }}
        >
          <Search
            size={16}
            strokeWidth={1.6}
            color="var(--muted)"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            placeholder={t('admin.accounts.search.placeholder', lang)}
            aria-label={t('admin.accounts.search.placeholder', lang)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontSize: 14,
              color: 'var(--ink)',
              background: 'var(--surface)',
            }}
          />
        </div>
        <button
          ref={createBtnRef}
          type="button"
          className="btn-green"
          onClick={() => setShowCreate(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginLeft: 'auto',
          }}
        >
          <UserPlus size={16} strokeWidth={1.6} aria-hidden="true" />
          {t('admin.accounts.create.btn', lang)}
        </button>
      </div>

      {/* Table */}
      <section className="card">
        <div className="ctitle">
          <span className="dot" style={{ background: 'var(--gd)' }} aria-hidden="true" />
          <span>{t('admin.accounts.list.title', lang)}</span>
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 16px',
              color: 'var(--muted)',
              fontSize: 14,
            }}
          >
            {t('admin.accounts.empty.search', lang).replace('{0}', searchTerm)}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr>
                {(
                  ['email', 'name', 'status', 'last_login', 'created', 'proposals'] as const
                ).map((col) => (
                  <th
                    key={col}
                    scope="col"
                    style={{
                      fontSize: 11.8,
                      fontWeight: 700,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '12px 14px',
                      borderBottom: '2px solid var(--border)',
                      textAlign:
                        col === 'proposals' ? 'right' : col === 'status' ? 'center' : 'left',
                    }}
                  >
                    {t(`admin.accounts.col.${col}` as DictKey, lang)}
                  </th>
                ))}
                <th scope="col" style={{ borderBottom: '2px solid var(--border)' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const displayName = p.displayName ?? p.name ?? p.email;
                const isDisabled = p.deletedAt !== null;
                const isBusy = busyRow === p.id;
                return (
                  <tr key={p.id} className="accounts-row">
                    <td style={{ fontSize: 13, color: 'var(--ink)', padding: '12px 14px' }}>
                      {p.email}
                    </td>
                    <td
                      style={{ fontSize: 13.5, color: 'var(--ink)', padding: '12px 14px' }}
                    >
                      {displayName}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                      <span
                        className={`chip ${isDisabled ? 'chip-disabled' : 'chip-active'}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {isDisabled ? (
                          <Ban size={12} strokeWidth={1.6} aria-hidden="true" />
                        ) : (
                          <CheckCircle2 size={12} strokeWidth={1.6} aria-hidden="true" />
                        )}
                        {t(
                          isDisabled
                            ? 'admin.accounts.status.disabled'
                            : 'admin.accounts.status.active',
                          lang,
                        )}
                      </span>
                    </td>
                    <td
                      style={{
                        fontSize: 13,
                        color: p.lastLoginAt ? 'var(--ink)' : 'var(--muted)',
                        padding: '12px 14px',
                      }}
                    >
                      {timeAgo(p.lastLoginAt, lang, nowMs)}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--ink)', padding: '12px 14px' }}>
                      {formatDate(new Date(p.createdAt), lang, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontSize: 13.5,
                        color: p.proposalsCount > 0 ? 'var(--ink)' : 'var(--muted)',
                        padding: '12px 14px',
                      }}
                    >
                      {p.proposalsCount}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {/* Disable / Re-enable toggle */}
                        <button
                          type="button"
                          className="btn-out"
                          disabled={isBusy}
                          aria-disabled={isBusy || undefined}
                          aria-busy={isBusy || undefined}
                          aria-label={`${t(isDisabled ? 'admin.accounts.action.enable' : 'admin.accounts.action.disable', lang)} ${displayName}`}
                          onClick={() => (isDisabled ? onReEnable(p) : onDisable(p))}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            padding: '0.4rem 0.9rem',
                          }}
                        >
                          {isBusy ? (
                            <Loader2
                              size={14}
                              strokeWidth={1.6}
                              style={{ animation: 'spin 1s linear infinite' }}
                              aria-hidden="true"
                            />
                          ) : isDisabled ? (
                            <CheckCircle2
                              size={14}
                              strokeWidth={1.6}
                              color="var(--gd)"
                              aria-hidden="true"
                            />
                          ) : (
                            <Ban size={14} strokeWidth={1.6} aria-hidden="true" />
                          )}
                          {t(
                            isDisabled
                              ? 'admin.accounts.action.enable'
                              : 'admin.accounts.action.disable',
                            lang,
                          )}
                        </button>

                        {/* Re-issue invitation — only for unredeemed invites (D-09-11b) */}
                        {p.hasUnredeemedInvite && (
                          <button
                            type="button"
                            className="btn-out"
                            disabled={isBusy}
                            aria-disabled={isBusy || undefined}
                            aria-label={`${t('admin.accounts.action.reissue', lang)} ${displayName}`}
                            onClick={() => onReissue(p)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12,
                              padding: '0.4rem 0.9rem',
                            }}
                          >
                            <Send size={14} strokeWidth={1.6} aria-hidden="true" />
                            {t('admin.accounts.action.reissue', lang)}
                          </button>
                        )}

                        {/* Send password reset — visible only for active partners */}
                        {!isDisabled && (
                          <button
                            type="button"
                            className="btn-out"
                            disabled={isBusy}
                            aria-disabled={isBusy || undefined}
                            aria-label={`${t('admin.accounts.action.reset_password', lang)} ${displayName}`}
                            onClick={() => onResetPassword(p)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12,
                              padding: '0.4rem 0.9rem',
                            }}
                          >
                            <KeyRound size={14} strokeWidth={1.6} aria-hidden="true" />
                            {t('admin.accounts.action.reset_password', lang)}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Modals */}
      {showCreate && (
        <CreatePartnerModal
          lang={lang}
          onClose={() => setShowCreate(false)}
          onCreated={(url) => {
            setShowCreate(false);
            setInviteUrl({ url, kind: 'invite' });
            refreshAfterAction();
          }}
        />
      )}
      {inviteUrl && (
        <InviteUrlModal
          url={inviteUrl.url}
          kind={inviteUrl.kind}
          lang={lang}
          onClose={() => setInviteUrl(null)}
          triggerRef={createBtnRef}
        />
      )}
    </>
  );
}
