import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const findFirstMock = vi.fn(async () => null);
const insertMock = vi.fn();
const returningMock = vi.fn(async () => [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Jane Doe',
    fonction: 'Chargée de compte',
    telephone: '0612345678',
    email: 'jane.doe@leasetic.fr',
    updatedAt: new Date('2026-09-08T00:00:00Z'),
    updatedBy: 'admin-1',
  },
]);
const whereMock = vi.fn(() => ({ returning: returningMock }));
const setMock = vi.fn((_fields: Record<string, unknown>) => ({ where: whereMock }));
const updateMock = vi.fn(() => ({ set: setMock }));

vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');
  return {
    db: () => ({
      query: {
        leaseticAdvisor: {
          findFirst: findFirstMock,
        },
      },
      update: updateMock,
      insert: insertMock,
    }),
    schema: real,
  };
});

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (a: unknown, b: unknown) => ({ _eq: [a, b] }),
  };
});

import { getAdvisor, upsertAdvisor, ADVISOR_ROW_ID } from './advisor';

describe('ADVISOR_ROW_ID', () => {
  it('is the fixed literal id seeded by the migration', () => {
    expect(ADVISOR_ROW_ID).toBe('00000000-0000-0000-0000-000000000001');
  });
});

describe('getAdvisor', () => {
  it('reads filtered by the fixed ADVISOR_ROW_ID', async () => {
    await getAdvisor();
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { _eq: [expect.anything(), ADVISOR_ROW_ID] },
      }),
    );
  });

  it('returns null (never undefined) when no row matches', async () => {
    findFirstMock.mockResolvedValueOnce(undefined as never);
    const row = await getAdvisor();
    expect(row).toBeNull();
  });

  it('returns the row when one matches', async () => {
    const seeded = {
      id: ADVISOR_ROW_ID,
      name: 'Jane Doe',
      fonction: 'Chargée de compte',
      telephone: '0612345678',
      email: 'jane.doe@leasetic.fr',
      updatedAt: new Date('2026-09-08T00:00:00Z'),
      updatedBy: 'admin-1',
    };
    findFirstMock.mockResolvedValueOnce(seeded as never);
    const row = await getAdvisor();
    expect(row).toEqual(seeded);
  });
});

describe('upsertAdvisor', () => {
  it('issues exactly one UPDATE targeting the fixed id and returns the updated row', async () => {
    updateMock.mockClear();
    whereMock.mockClear();

    const row = await upsertAdvisor({
      name: 'Jane Doe',
      fonction: 'Chargée de compte',
      telephone: '0612345678',
      email: 'jane.doe@leasetic.fr',
      actorId: 'admin-1',
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(whereMock).toHaveBeenCalledWith({ _eq: [expect.anything(), ADVISOR_ROW_ID] });
    expect(row.email).toBe('jane.doe@leasetic.fr');
  });

  it('never calls insert', async () => {
    insertMock.mockClear();
    await upsertAdvisor({
      name: 'Jane Doe',
      fonction: 'Chargée de compte',
      telephone: '0612345678',
      email: 'jane.doe@leasetic.fr',
      actorId: 'admin-1',
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('sets updatedAt to the current time and updatedBy to the supplied actor id', async () => {
    setMock.mockClear();
    await upsertAdvisor({
      name: 'Jane Doe',
      fonction: 'Chargée de compte',
      telephone: '0612345678',
      email: 'jane.doe@leasetic.fr',
      actorId: 'admin-42',
    });
    const setArg = setMock.mock.calls[0][0] as { updatedAt: Date; updatedBy: string };
    expect(setArg.updatedBy).toBe('admin-42');
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });
});
