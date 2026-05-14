// Mock target for the presigned PUT URL returned by the issuance/quotation/
// policy-admin mock initiate endpoints (`/api/_mock/uploads/...`). In a real
// deployment the initiate response would hand back a presigned object-store
// URL — here we accept and discard the bytes so the two-step upload flow
// (initiate JSON → PUT file → ingest) can complete end-to-end against the
// mock backend.
//
// Returns 200 OK with the file metadata (size, content-type) so the upload
// hook has something to log. Accepts PUT, POST, and PATCH; rejects GET to
// match the semantics of a write-only presigned URL.

import { NextResponse, type NextRequest } from 'next/server';

async function handleWrite(req: NextRequest): Promise<NextResponse> {
  const blob = await req.arrayBuffer().catch(() => null);
  return NextResponse.json({
    ok: true,
    receivedBytes: blob?.byteLength ?? 0,
    contentType: req.headers.get('content-type') ?? null,
  });
}

export const PUT = handleWrite;
export const POST = handleWrite;
export const PATCH = handleWrite;

export function GET() {
  return NextResponse.json(
    { error: 'mock upload URL is write-only' },
    { status: 405 },
  );
}
