import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Reserved for Phase 8 (PDF) — do not enable without justification
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
