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
  deriveDisplayStatus,
} from './proposals';
export type {
  Cursor,
  CreateProposalArgs,
  FinalizePdfArgs,
  ListProposalsArgs,
  SearchProposalsArgs,
  ListResult,
  DisplayStatus,
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

// Phase 30 Plan 04 — owner-scoped client-relationship registry (CRM-02/04/06/07).
export {
  listClientBook,
  getClientRelationshipForOwner,
  listContactsForRelationship,
  listProposalsForRelationship,
} from './client-relationships';
export type {
  ClientBookRow,
  ClientBookSort,
  ClientBookDir,
  ListClientBookArgs,
  ListClientBookResult,
  ClientRelationshipDetail,
  ContactListRow,
  RelationshipProposalRow,
} from './client-relationships';

// Phase 30 Plan 04 — admin-only company & relationship registry (CRM-03).
export {
  listCompaniesForAdmin,
  getCompanyForAdmin,
  listRelationshipsForCompany,
  getRelationshipForAdmin,
  listContactsForRelationshipAdmin,
  listProposalsForRelationshipAdmin,
} from './companies';
export type { AdminCompanyRow, AdminRelationshipRow } from './companies';
