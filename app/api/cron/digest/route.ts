import { runDigest } from '@/lib/digest/pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // the ranking call can take ~30s

/** Vercel sends `Authorization: Bearer $CRON_SECRET` on scheduled invocations. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

/** Daily pipeline trigger (Vercel Cron). `?force=1` bypasses the once-per-day guard. */
export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return new Response('unauthorized', { status: 401 });
  }

  const force = new URL(req.url).searchParams.get('force') === '1';
  const outcome = await runDigest({ force });

  const httpStatus = outcome.status === 'error' ? 500 : 200;
  return Response.json(outcome, { status: httpStatus });
}
