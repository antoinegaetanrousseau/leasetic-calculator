'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronDown } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { t, type Lang } from '@/lib/i18n/dictionaries';

interface UserMenuProps {
  displayName: string;
  email: string;
  lang: Lang;
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function UserMenu({ displayName, email, lang }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const handleLogout = async () => {
    // AUTH-18 / D-24: official client function only — never custom POST.
    await authClient.signOut();
    // The Sonner success toast is shown on /login via the ?logged_out=1 query
    // param pickup in LoginForm (Plan 06-05).
    router.push('/login?logged_out=1');
    router.refresh();
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('shell.user.menu.aria', lang)}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 9999,
          background: open ? 'var(--hover-overlay)' : 'transparent',
          color: 'var(--ink)',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!open)
            (e.currentTarget as HTMLButtonElement).style.background =
              'var(--hover-overlay)';
        }}
        onMouseLeave={(e) => {
          if (!open)
            (e.currentTarget as HTMLButtonElement).style.background =
              'transparent';
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 9999,
            background: 'var(--gd)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initials(displayName)}
        </span>
        <span
          style={{
            fontSize: '14.5px',
            fontWeight: 500,
            color: 'var(--ink)',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.6}
          style={{ color: 'var(--muted)' }}
        />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            width: 240,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            padding: 8,
            zIndex: 110,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: '14.5px',
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: '11.2px',
                color: 'var(--muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {email}
            </div>
          </div>
          <button
            role="menuitem"
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '10px 16px',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--ink)',
              border: 'none',
              fontSize: '14.5px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--hover-overlay)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'transparent';
            }}
          >
            <LogOut
              size={17}
              strokeWidth={1.6}
              style={{ color: 'var(--muted)' }}
            />
            <span>{t('shell.user.menu.logout', lang)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
