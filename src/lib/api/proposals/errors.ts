import 'server-only';

/**
 * Bounded error codes returned to the client. Anti-enumeration / minimum-leak
 * discipline (matches Phase 5's classifyError + Phase 6's anti-enumeration
 * generic login error). Internal logs may carry richer detail.
 */
export type SubmitErrorCode =
  | 'invalid_body'              // 400 — Zod validation failed
  | 'invalid_idempotency_key'   // 400 — header missing or not a UUID
  | 'unauthorized'              // 401 — no session (handled by requireUser → redirect or 401)
  | 'seed_not_applied'          // 503 — getLatestGlobalParams returned null
  | 'pdf_render_failed'         // 500 — D-B1 caught
  | 'pdf_upload_failed'         // 500 — D-B1 caught
  | 'finalize_failed'           // 500 — D-B1 caught (UPDATE row failed)
  | 'unknown_error';            // 500 — fallback (unexpected throw before INSERT)

export class SubmitError extends Error {
  constructor(public code: SubmitErrorCode, message: string, public httpStatus: number) {
    super(message);
    this.name = 'SubmitError';
  }
}

export const errorHttpStatus: Record<SubmitErrorCode, number> = {
  invalid_body: 400,
  invalid_idempotency_key: 400,
  unauthorized: 401,
  seed_not_applied: 503,
  pdf_render_failed: 500,
  pdf_upload_failed: 500,
  finalize_failed: 500,
  unknown_error: 500,
};
