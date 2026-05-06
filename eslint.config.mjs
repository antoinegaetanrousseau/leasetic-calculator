import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// eslint-config-next 16.x exports a flat config array directly (ESLint 9 native).
// No FlatCompat needed.
const nextConfig = require('eslint-config-next/core-web-vitals');
const nextTypescript = require('eslint-config-next/typescript');

/**
 * Flat ESLint config for Leasétic Matrice v1.1.
 *
 * Two-layer protection of OVH portability (BOOT-06, ARCHITECTURE §9, PITFALLS §6.1):
 *  Layer 1: ESLint `no-restricted-imports` rule — fails lint when forbidden packages
 *           are imported outside the explicit adapter directories (src/lib/storage/, src/lib/db/).
 *  Layer 2: CI grep script (scripts/check-no-vercel-only-imports.sh) — defense in depth
 *           against dynamic imports and edge cases ESLint might miss.
 */
const config = [
  ...nextConfig,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'drizzle/**',
      'public/**',
      'out/**',
      'coverage/**',
    ],
  },
  {
    // Apply the no-vercel-only rule everywhere EXCEPT inside the adapter directories.
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    ignores: [
      'src/lib/storage/**',
      'src/lib/db/**',
      'eslint.config.mjs',
      'drizzle.config.ts',
      'scripts/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@vercel/blob',
              message:
                'Direct @vercel/blob import is forbidden outside src/lib/storage/. Use `import { storage } from "@/lib/storage"` instead. (BOOT-05, ARCHITECTURE §9)',
            },
            {
              name: '@vercel/postgres',
              message:
                '@vercel/postgres is discontinued and forbidden. Use `import { db } from "@/lib/db"` (Drizzle).',
            },
            {
              name: '@vercel/kv',
              message:
                '@vercel/kv is Vercel-only and forbidden (OVH portability). Use Postgres or env vars instead.',
            },
            {
              name: '@vercel/edge-config',
              message:
                '@vercel/edge-config is Vercel-only and forbidden. Use env vars or the global_params table instead.',
            },
            {
              name: '@neondatabase/serverless',
              message:
                'Direct @neondatabase/serverless import is forbidden outside src/lib/db/. Use `import { db } from "@/lib/db"`.',
            },
            {
              name: 'postgres',
              message:
                'Direct postgres (postgres-js) import is forbidden outside src/lib/db/. Use `import { db } from "@/lib/db"`.',
            },
          ],
          patterns: [
            {
              group: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
              message:
                'Direct @aws-sdk import is forbidden outside src/lib/storage/. Use `import { storage } from "@/lib/storage"`.',
            },
          ],
        },
      ],
    },
  },
];

export default config;
