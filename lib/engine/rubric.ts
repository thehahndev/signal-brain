import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Load the canonical rubric.md. It lives at the repo root and is read at runtime
 * from the deployed bundle (read-only is fine; Phase 3's commit-back is when this
 * moves to a writable GitHub-raw source). On Vercel, cwd is the project root and
 * rubric.md is shipped via `outputFileTracingIncludes` in next.config.ts; in local
 * `next dev` / `tsx` from the repo root, cwd is the root too.
 */
export function loadRubric(): string {
  return readFileSync(join(process.cwd(), 'rubric.md'), 'utf8');
}
