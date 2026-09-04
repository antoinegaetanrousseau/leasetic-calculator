import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MOMENTUM_TIME_ZONE,
  currentWeekWindow,
  formatTrackedSinceFragment,
  shiftWeekKey,
  weekKeyFromMs,
} from './window';

describe('currentWeekWindow', () => {
  it('resolves the Europe/Paris Mon–Sun window for a mid-week instant', () => {
    const { start, end, key } = currentWeekWindow(Date.parse('2026-09-09T10:00:00Z'));
    expect(start.toISOString()).toBe('2026-09-06T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-13T22:00:00.000Z');
    expect(key).toBe('2026-09-07');
  });

  it('keys a Sunday-late instant (23:59 Paris) into the PREVIOUS week', () => {
    const { key } = currentWeekWindow(Date.parse('2026-09-06T21:59:00Z'));
    expect(key).toBe('2026-08-31');
  });

  it('keys Monday 00:00 Paris into the week it starts', () => {
    const { key } = currentWeekWindow(Date.parse('2026-09-06T22:00:00Z'));
    expect(key).toBe('2026-09-07');
  });

  it('the UTC trap: a UTC-Sunday instant that is Monday 00:00 in Paris keys forward, not back', () => {
    const { key } = currentWeekWindow(Date.parse('2026-09-13T22:00:00Z'));
    expect(key).toBe('2026-09-14');
    expect(key).not.toBe('2026-09-07');
  });

  it('spring DST: the week containing 2026-03-25 is 167 hours, not 168', () => {
    const { start, end } = currentWeekWindow(Date.parse('2026-03-25T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-03-22T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-29T22:00:00.000Z');
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(167);
  });

  it('autumn DST: the week containing 2026-10-21 is 169 hours, not 168', () => {
    const { start, end } = currentWeekWindow(Date.parse('2026-10-21T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-10-18T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-25T23:00:00.000Z');
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(169);
  });
});

describe('weekKeyFromMs', () => {
  it('agrees with currentWeekWindow(nowMs).key for the same instant', () => {
    const nowMs = Date.parse('2026-09-09T10:00:00Z');
    expect(weekKeyFromMs(nowMs)).toBe(currentWeekWindow(nowMs).key);
  });
});

describe('shiftWeekKey', () => {
  it('shifts forward one week, DST-safe (spring)', () => {
    expect(shiftWeekKey('2026-03-23', 1)).toBe('2026-03-30');
  });

  it('shifts backward one week', () => {
    expect(shiftWeekKey('2026-09-07', -1)).toBe('2026-08-31');
  });
});

describe('formatTrackedSinceFragment', () => {
  it('returns the bare fragment in French', () => {
    expect(formatTrackedSinceFragment('fr')).toBe('septembre 2026');
  });

  it('returns the bare fragment in English', () => {
    expect(formatTrackedSinceFragment('en')).toBe('September 2026');
  });
});

describe('source guards', () => {
  it('never calls Date.now() with no argument', () => {
    const filePath = path.join(__dirname, 'window.ts');
    const source = readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');
    expect(source).not.toMatch(/Date\.now\(\)/);
  });

  it('declares the Europe/Paris Monday-start boundary explicitly', () => {
    const filePath = path.join(__dirname, 'window.ts');
    const source = readFileSync(filePath, 'utf-8');
    expect(source).toContain('weekStartsOn: 1');
    expect(MOMENTUM_TIME_ZONE).toBe('Europe/Paris');
  });
});
