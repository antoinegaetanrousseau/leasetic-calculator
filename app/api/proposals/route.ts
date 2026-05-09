import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang } from '@/lib/i18n';
import { submitProposal } from '@/lib/api/proposals/submit';
import { SubmitError, errorHttpStatus, type SubmitErrorCode } from '@/lib/api/proposals/errors';

// PROP-09 + PITFALLS §1.3: route handler, NOT server action.
// Node runtime — @react-pdf/renderer + storage adapter both need Node APIs.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Step 0: requireUser; Phase 6 helper redirects to /login on no session.
  // For an API route, we DON'T want a redirect — convert to 401 JSON.
  // requireUser uses `redirect()` from next/navigation, which throws a
  // NEXT_REDIRECT error inside route handlers. We catch and translate.
  let userId: string;
  try {
    const { session } = await requireUser();
    userId = session.user.id;
  } catch {
    // session missing → redirect threw. Translate to JSON 401.
    return jsonError('unauthorized');
  }

  // D-A2: capture lang FROM the session/cookie at gen time. The language is
  // locked into the row at INSERT time and never mutates (PROP-23 immutability).
  const lang = (await getCurrentLang()) as 'fr' | 'en';

  // Read raw JSON body. NextRequest.json() throws on invalid JSON.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('invalid_body');
  }

  const idempotencyKey = req.headers.get('Idempotency-Key') ?? '';

  try {
    const result = await submitProposal({
      userId,
      language: lang,
      idempotencyKey,
      body,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof SubmitError) {
      return jsonError(err.code, err.httpStatus);
    }
    // Unexpected throw → log server-side, return generic 500.
    console.error('[POST /api/proposals] unknown_error', err);
    return jsonError('unknown_error');
  }
}

function jsonError(code: SubmitErrorCode, statusOverride?: number) {
  return NextResponse.json(
    { error: code },
    { status: statusOverride ?? errorHttpStatus[code] },
  );
}
