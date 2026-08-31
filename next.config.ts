import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Reserved for Phase 8 (PDF) — do not enable without justification
  },
  // Pin the Turbopack workspace root to this project. Without this, Turbopack's
  // lockfile-scanning heuristic can walk up and pick a stray package-lock.json
  // higher in the filesystem as the root, breaking module resolution (e.g.
  // "Can't resolve 'tailwindcss'") on machines with an unrelated lockfile in a
  // parent directory.
  turbopack: {
    root: path.join(__dirname),
  },
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
