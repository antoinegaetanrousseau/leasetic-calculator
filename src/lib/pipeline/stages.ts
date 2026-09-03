/**
 * The pipeline stage vocabulary — single source of truth for the TypeScript
 * side of Phase 33's D-02 contract ("a TypeScript union plus a DB CHECK,
 * never a lookup table"). The DB half is `client_relationships_stage_check`
 * in `src/db/schema.ts`; both enumerate the identical seven values, in the
 * identical order, per D-01.
 *
 * D-04: nothing in v1.6 writes 'signe' or 'debloque'. They exist in the
 * vocabulary and render as visibly not-yet-reachable, reserved for the
 * future contract-tool integration (PIPE-02). No code path in this phase
 * — or any phase before the contract-tool integration lands — may write
 * either value to `client_relationships.stage`.
 *
 * No `server-only` import here: this module is consumed by client
 * components (the kanban board, the mobile stage picker) as well as
 * server actions and query modules.
 */
import type { DictKey } from '@/lib/i18n/dictionaries';

/** The seven-value stage vocabulary, in D-01 order. */
export const PIPELINE_STAGES = [
  'prospect',
  'qualifie',
  'proposition_envoyee',
  'negociation',
  'perdu',
  'signe',
  'debloque',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** The two system-owned stages (D-04) — never written by v1.6 code. */
export const RESERVED_STAGES = ['signe', 'debloque'] as const satisfies readonly PipelineStage[];

export type ReservedStage = (typeof RESERVED_STAGES)[number];

/** The five partner-settable stages (everything except the reserved pair). */
export const PARTNER_SETTABLE_STAGES = [
  'prospect',
  'qualifie',
  'proposition_envoyee',
  'negociation',
  'perdu',
] as const satisfies readonly PipelineStage[];

export function isReservedStage(value: string): value is ReservedStage {
  return (RESERVED_STAGES as readonly string[]).includes(value);
}

/** Matches `client_relationships.stage`'s DB default. */
export const DEFAULT_STAGE: PipelineStage = 'prospect';

/**
 * Maps each stage to its `pipeline.stage.*` dictionary key (added in Phase
 * 33 plan 01 task 3, this same plan).
 */
export const STAGE_DICT_KEY: Record<PipelineStage, DictKey> = {
  prospect: 'pipeline.stage.prospect',
  qualifie: 'pipeline.stage.qualifie',
  proposition_envoyee: 'pipeline.stage.propositionEnvoyee',
  negociation: 'pipeline.stage.negociation',
  perdu: 'pipeline.stage.perdu',
  signe: 'pipeline.stage.signe',
  debloque: 'pipeline.stage.debloque',
};
