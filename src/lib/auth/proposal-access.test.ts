/**
 * 37-REVIEW.md WR-02 — the single proposal-access rule.
 *
 * This is the file that has to be exhaustive, because it is now the only place the rule is
 * written down. The matrix below is every (role x ownership) pair plus the absence case.
 */
import { describe, expect, it } from 'vitest';
import { resolveProposalAccess } from './proposal-access';
import type { Role } from './require';

const OWNER = 'user-owner';
const OTHER = 'user-other';
const proposal = { userId: OWNER };
const viewer = (id: string, role: Role) => ({ id, role });

describe('resolveProposalAccess — the full role x ownership matrix', () => {
  const cases: Array<{
    role: Role;
    viewerId: string;
    label: string;
    canView: boolean;
    isOwner: boolean;
  }> = [
    { role: 'partner', viewerId: OWNER, label: 'owning partner', canView: true, isOwner: true },
    { role: 'partner', viewerId: OTHER, label: 'non-owning partner', canView: false, isOwner: false },
    { role: 'sales', viewerId: OWNER, label: 'owning sales', canView: true, isOwner: true },
    { role: 'sales', viewerId: OTHER, label: 'non-owning sales', canView: false, isOwner: false },
    { role: 'admin', viewerId: OWNER, label: 'owning admin', canView: true, isOwner: true },
    { role: 'admin', viewerId: OTHER, label: 'non-owning admin (D-37-01 bypass)', canView: true, isOwner: false },
  ];

  for (const c of cases) {
    it(`${c.label}: canView=${c.canView}, isOwner=${c.isOwner}`, () => {
      expect(resolveProposalAccess(proposal, viewer(c.viewerId, c.role))).toEqual({
        canView: c.canView,
        isOwner: c.isOwner,
      });
    });
  }

  it('only `admin` gets the view bypass — partner and sales do not', () => {
    const roles: Role[] = ['partner', 'sales', 'admin'];
    const bypassed = roles.filter(
      (role) => resolveProposalAccess(proposal, viewer(OTHER, role)).canView,
    );
    expect(bypassed).toEqual(['admin']);
  });

  it('the bypass is view-only — a non-owning admin never gets isOwner', () => {
    expect(resolveProposalAccess(proposal, viewer(OTHER, 'admin')).isOwner).toBe(false);
  });

  it('absence beats role: a null proposal is fail-closed even for an admin', () => {
    expect(resolveProposalAccess(null, viewer(OTHER, 'admin'))).toEqual({
      canView: false,
      isOwner: false,
    });
    expect(resolveProposalAccess(undefined, viewer(OWNER, 'admin'))).toEqual({
      canView: false,
      isOwner: false,
    });
  });

  it('decides on userId alone — no other proposal field can influence it', () => {
    const noisy = {
      userId: OWNER,
      // Fields a caller might plausibly pass through. None may change the verdict.
      deletedAt: new Date(),
      status: 'archived',
      pdfBlobKey: null,
    };
    expect(resolveProposalAccess(noisy, viewer(OWNER, 'partner'))).toEqual({
      canView: true,
      isOwner: true,
    });
  });
});
