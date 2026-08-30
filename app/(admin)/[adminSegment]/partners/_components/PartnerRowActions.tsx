'use client';

/**
 * Phase 18 Plan 03 Task 2 — PartnerRowActions (D-10, D-11).
 *
 * Per-row overflow ⋯ menu rendered in Partners table cell 6. Custom React
 * state + click-outside hook + Escape handler (no Radix — Phase 17 confirmed
 * the codebase has no Radix dependency; UI-SPEC line 363 recommends option b).
 *
 * D-10 conditional visibility:
 *   - Renvoyer l'invitation       (status === 'invited')
 *   - Désactiver le compte        (status === 'active')
 *   - Réactiver le compte         (status === 'inactive')
 *   - Voir les propositions du partenaire  (always — D-11 link)
 *
 * D-11 link: <Link href="/proposals?user_id={partnerId}"> — the /proposals SSR
 * route (Plan 18-01) accepts ?user_id= when the caller is admin (T-18-01-01
 * IDOR mitigation gated at the SSR layer + library layer).
 *
 * Server actions reused as-is (Phase 14 / Plan 18-01 — no new actions in 18-03):
 *   - adminDisableUser(partnerId)         — single-arg
 *   - adminReEnableUser(partnerId)        — single-arg
 *   - adminReissueInvitation({email, displayName, language})  — multi-arg;
 *     partner email/name + the admin's current language pref are threaded
 *     in via props. (Phase 18 follow-up note: partner's own language pref
 *     would be more accurate; would require extending PartnerRow with a
 *     language column projection. Out of scope for the visual rebuild.)
 */
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { BanIcon, CheckCircleIcon, ExternalLinkIcon, LoaderIcon, MoreVerticalIcon, RefreshIcon, SendIcon } from '@/components/ui/icons';
import { toast } from 'sonner';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import {
  adminDisableUser,
  adminReEnableUser,
  adminReissueInvitation,
  adminUpdatePartnerType,
} from '@/lib/admin';
import type { PartnerStatus } from '@/lib/db/queries/partners';

interface MenuPos { top: number; right: number; }

export interface PartnerRowActionsProps {
  partnerId: string;
  status: PartnerStatus;
  adminSegment: string;
  lang: Lang;
  /**
   * Partner email + display name — required for the `Renvoyer l'invitation`
   * action (adminReissueInvitation signature). Optional so PartnersList
   * callers without these fields populated still compile; the action
   * gracefully falls back to a toast error when missing.
   */
  partnerEmail?: string;
  partnerDisplayName?: string;
  /**
   * PTYPE-03 / D-08: current partner type — used to build the type-change
   * target options in the overflow menu. Optional for backward-compat.
   */
  partnerType?: 'Agent' | 'Commercial' | 'Partenaire';
}

const MENU_ITEM_STYLE = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: 8,
  padding: '8px 12px',
  fontSize: 14,
  color: 'var(--ink)',
  cursor: 'pointer' as const,
  background: 'transparent',
  border: 'none',
  width: '100%',
  textAlign: 'left' as const,
  textDecoration: 'none' as const,
};

export function PartnerRowActions({
  partnerId,
  status,
  lang,
  partnerEmail,
  partnerDisplayName,
  partnerType,
}: PartnerRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Compute fixed position when the menu opens so it escapes any overflow:hidden ancestor.
  useEffect(() => {
    if (!open || !buttonRef.current) { setMenuPos(null); return; }
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }, [open]);

  // Click-outside: close when mousedown lands outside both the button and the menu.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !buttonRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape key handler.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const refreshAfterAction = () => {
    startTransition(() => router.refresh());
  };

  const onDisable = async () => {
    setBusy(true);
    try {
      await adminDisableUser(partnerId);
      toast.success(t('admin.accounts.toast.disable.success', lang).replace('{0}', partnerDisplayName ?? partnerEmail ?? ''));
      refreshAfterAction();
    } catch {
      toast.error(t('admin.accounts.toast.disable.error', lang));
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const onReEnable = async () => {
    setBusy(true);
    try {
      await adminReEnableUser(partnerId);
      toast.success(t('admin.accounts.toast.enable.success', lang).replace('{0}', partnerDisplayName ?? partnerEmail ?? ''));
      refreshAfterAction();
    } catch {
      toast.error(t('admin.accounts.toast.enable.error', lang));
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const onReissue = async () => {
    if (!partnerEmail) {
      toast.error(t('admin.accounts.toast.reissue.error', lang));
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await adminReissueInvitation({
        email: partnerEmail,
        displayName: partnerDisplayName ?? partnerEmail,
        language: lang,
      });
      toast.success(t('admin.accounts.toast.reissue.success', lang));
      refreshAfterAction();
    } catch {
      toast.error(t('admin.accounts.toast.reissue.error', lang));
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  // PTYPE-03 / D-08: type-change handler.
  // D-08: window.confirm explains future-vs-frozen economics before calling the action.
  // The three target types are the other two options relative to the current type
  // — simplest pattern consistent with the existing window.confirm baseline (UI-SPEC §443).
  const onChangeType = async (targetType: 'Agent' | 'Commercial' | 'Partenaire') => {
    if (!window.confirm(t('admin.partners.type.change.confirm', lang))) return;
    setBusy(true);
    try {
      await adminUpdatePartnerType(partnerId, targetType);
      toast.success(t('admin.partners.action.changeType', lang));
      refreshAfterAction();
    } catch {
      toast.error(t('admin.partners.error.type_change', lang));
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  // D-10 conditional visibility — exactly one of resend/disable/re-enable
  // is rendered per row based on status.
  const showResend = status === 'invited';
  const showDisable = status === 'active';
  const showReEnable = status === 'inactive';

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('admin.partners.action.viewProposals', lang)}
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        style={{
          width: 32,
          height: 32,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          color: 'var(--muted)',
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        {busy ? (
          <HugeiconsIcon icon={LoaderIcon} size={16} strokeWidth={1.6} aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <HugeiconsIcon icon={MoreVerticalIcon} size={16} strokeWidth={1.6} aria-hidden="true" />
        )}
      </button>

      {open && menuPos && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: menuPos.top,
            right: menuPos.right,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '4px 0',
            minWidth: 240,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            zIndex: 1000,
          }}
        >
          {showResend && (
            <button
              type="button"
              role="menuitem"
              onClick={onReissue}
              style={MENU_ITEM_STYLE}
            >
              <HugeiconsIcon icon={SendIcon} size={14} strokeWidth={1.6} aria-hidden="true" style={{ color: 'var(--muted)' }} />
              {t('admin.partners.action.resendInvitation', lang)}
            </button>
          )}
          {showDisable && (
            <button
              type="button"
              role="menuitem"
              onClick={onDisable}
              style={MENU_ITEM_STYLE}
            >
              <HugeiconsIcon icon={BanIcon} size={14} strokeWidth={1.6} aria-hidden="true" style={{ color: 'var(--muted)' }} />
              {t('admin.partners.action.disableAccount', lang)}
            </button>
          )}
          {showReEnable && (
            <button
              type="button"
              role="menuitem"
              onClick={onReEnable}
              style={MENU_ITEM_STYLE}
            >
              <HugeiconsIcon icon={CheckCircleIcon} size={14} strokeWidth={1.6} aria-hidden="true" style={{ color: 'var(--gd)' }} />
              {t('admin.partners.action.enableAccount', lang)}
            </button>
          )}
          {/* PTYPE-03 / D-08: type-change options — show all types except the current one.
              D-04: plain labels (Agent/Commercial/Partenaire) per the enum. */}
          {(['Agent', 'Commercial', 'Partenaire'] as const)
            .filter((type) => type !== partnerType)
            .map((targetType) => (
              <button
                key={targetType}
                type="button"
                role="menuitem"
                onClick={() => onChangeType(targetType)}
                style={MENU_ITEM_STYLE}
              >
                <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.6} aria-hidden="true" style={{ color: 'var(--muted)' }} />
                {`${t('admin.partners.action.changeType', lang)} → ${targetType}`}
              </button>
            ))}
          <Link
            href={`/proposals?user_id=${partnerId}`}
            role="menuitem"
            style={MENU_ITEM_STYLE}
            onClick={() => setOpen(false)}
          >
            <HugeiconsIcon icon={ExternalLinkIcon} size={14} strokeWidth={1.6} aria-hidden="true" style={{ color: 'var(--muted)' }} />
            {t('admin.partners.action.viewProposals', lang)}
          </Link>
        </div>
      )}
    </div>
  );
}
