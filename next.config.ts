import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Reserved for Phase 8 (PDF) — do not enable without justification
  },
  // Pin the file-tracing root to this project so `output: 'standalone'` emits
  // `.next/standalone/server.js` at the top level (the layout the OVH deploy
  // expects). Without this, Next's lockfile-scanning heuristic walks up and can
  // pick a stray package-lock.json higher in the filesystem — on a machine with
  // `~/package-lock.json` the root becomes the home directory and the output
  // nests as `.next/standalone/Developer/<project>/server.js`, which the deploy
  // cannot start.
  //
  // Deliberately NOT `turbopack.root`. Pinning THAT breaks `next dev` on Next
  // 16.2.4: Tailwind's PostCSS pass then resolves `@import 'tailwindcss'`
  // (app/globals.css) from the project's PARENT directory and every page fails
  // to compile with "Can't resolve 'tailwindcss' in '<parent>'". The two options
  // are independent — file tracing controls the standalone layout, turbopack.root
  // controls the module graph — so pin only the one that is actually needed.
  //
  // If you ever hit that "Can't resolve 'tailwindcss'" error, `rm -rf .next`
  // before concluding a config change did not work: Turbopack caches the failed
  // resolution and keeps replaying it against the new config.
  outputFileTracingRoot: path.join(__dirname),
  // Pin generateBuildId to git SHA for OVH parity (per STACK.md §1)
  generateBuildId: async () => process.env.GIT_COMMIT_SHA ?? 'dev-build',
  async redirects() {
    return [
      // D-02: 308 permanent redirect for v1.1 bookmarks
      {
        source: '/:adminSegment/accounts/:path*',
        destination: '/:adminSegment/partners/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
