/**
 * Phase 8 query helpers — barrel.
 *
 * Consumers (server route, detail page, list page, delete actions, manual
 * purge CLI) import from '@/lib/db/queries' — never from individual sibling
 * files. Mirrors the @/lib/calc barrel discipline established in Phase 7.
 */
export {
  encodeCursor,
  decodeCursor,
  createProposal,
  finalizePdfBlobOnProposal,
  findByIdempotencyKey,
  getProposalById,
  listProposalsByUser,
  searchProposals,
  softDeleteProposal,
  restoreProposal,
  hardPurgeProposal,
  listPurgeCandidates,
} from './proposals';
export type {
  Cursor,
  CreateProposalArgs,
  FinalizePdfArgs,
  ListProposalsArgs,
  SearchProposalsArgs,
  ListResult,
} from './proposals';

export {
  getLatestGlobalParams,
  insertGlobalParams,
  listGlobalParamsHistory,
  encodeGlobalParamsCursor,
  decodeGlobalParamsCursor,
} from './global-params';
export type {
  GlobalParamsCursor,
  ListGlobalParamsHistoryArgs,
  GlobalParamsHistoryResult,
  GlobalParamsHistoryRow,
} from './global-params';

export { listPartnersWithCounts } from './users';
export type { PartnerWithCount } from './users';

export { writeAuditLog } from './audit-log';
export type { AuditAction, AuditTargetType, WriteAuditLogArgs } from './audit-log';
