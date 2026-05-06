import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseDatabaseUrl, createDb } from './client';
import { DbError } from './errors';
import { __resetDbForTests, db } from './index';

describe('parseDatabaseUrl', () => {
  it('classifies *.neon.tech as neon-http', () => {
    const r = parseDatabaseUrl('postgres://u:p@ep-xxx.us-east-1.aws.neon.tech:5432/db');
    expect(r.kind).toBe('neon-http');
    expect(r.host).toContain('neon.tech');
  });

  it('classifies *.neon.build (preview branch) as neon-http', () => {
    const r = parseDatabaseUrl('postgres://u:p@ep-yyy.neon.build:5432/db');
    expect(r.kind).toBe('neon-http');
  });

  it('classifies localhost as postgres-js', () => {
    const r = parseDatabaseUrl('postgres://u:p@localhost:5432/db');
    expect(r.kind).toBe('postgres-js');
  });

  it('classifies arbitrary hosts as postgres-js (e.g. OVH managed PG)', () => {
    const r = parseDatabaseUrl('postgres://u:p@pg-12345.gra3.databases.cloud.ovh.net:5432/db');
    expect(r.kind).toBe('postgres-js');
  });

  it('throws DbError on malformed URL', () => {
    expect(() => parseDatabaseUrl('not a url')).toThrow(DbError);
    expect(() => parseDatabaseUrl('not a url')).toThrow(/invalid URL/);
  });
});

describe('createDb', () => {
  const original = process.env.DATABASE_URL;
  beforeEach(() => {
    __resetDbForTests();
    delete process.env.DATABASE_URL;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
    __resetDbForTests();
  });

  it('throws when DATABASE_URL is unset', () => {
    expect(() => createDb()).toThrow(DbError);
    expect(() => createDb()).toThrow(/DATABASE_URL/);
  });

  it('returns a neon-http driver when host is neon.tech', () => {
    process.env.DATABASE_URL = 'postgres://u:p@ep-test.us-east-1.aws.neon.tech:5432/db';
    const d = createDb();
    expect(d.__driverKind).toBe('neon-http');
  });

  it('returns a postgres-js driver when host is non-neon', () => {
    process.env.DATABASE_URL = 'postgres://u:p@localhost:5432/db';
    const d = createDb();
    expect(d.__driverKind).toBe('postgres-js');
  });

  it('db() singleton returns the same instance on repeated calls', () => {
    process.env.DATABASE_URL = 'postgres://u:p@localhost:5432/db';
    const a = db();
    const b = db();
    expect(a).toBe(b);
  });
});
