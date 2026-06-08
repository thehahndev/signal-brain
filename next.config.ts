import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The cron digest route reads the bundled rubric.md at runtime via fs. Next only
  // ships files it can statically trace, so include rubric.md explicitly for that route.
  // (Serverless FS is read-only/ephemeral — reading a bundled file is fine; writing isn't.)
  outputFileTracingIncludes: {
    '/api/cron/digest': ['./rubric.md'],
  },
};

export default nextConfig;
