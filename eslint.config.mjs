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
      '.remember/**',
      'coverage/**',
      'src/figma/**',
      // Vendor code imported verbatim from the ReUI registry (Base UI · Maia · Neutral).
      // Not hand-maintained: re-imported wholesale on upgrade, so house rules are enforced
      // at the call sites that consume these, not inside the vendored source.
      'src/components/ui/**',
      'src/components/reui/**',
      'src/components/blocks/**',
      'src/hooks/use-mobile.ts',
      'src/hooks/use-file-upload.ts',
      'src/hooks/use-copy-to-clipboard.ts',
      // Agent git-worktree scratch space: full duplicate copies of this repo.
      // Ignored via .git/info/exclude (a local, untracked file), so ESLint's
      // flat config cannot pick it up from .gitignore — it must be listed here.
      '.claude/**',
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
            {
              name: '@react-pdf/renderer',
              message:
                '`@react-pdf/renderer` may only be imported from src/lib/pdf/. PDF rendering goes through src/lib/pdf/render.ts (renderProposalPdf).',
            },
            {
              name: 'exceljs',
              message:
                '`exceljs` may only be imported from src/lib/xlsx/. XLSX generation goes through src/lib/xlsx/render.ts (generateProposalsXlsx). (D-02)',
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
  {
    // SHELL-06 / D-26: hardcoded JSX text literals must go through t().
    // The selector matches JSXText nodes whose value contains 2+ consecutive
    // letters (Unicode-aware: covers French accents). It does NOT match:
    //  - text inside expressions ({t('key', lang)}) because those are JSXExpressionContainer
    //  - whitespace-only JSX (e.g. line breaks, indentation)
    //  - 1-character punctuation runs (·, ©, ▾, etc.)
    // Test files and config files are exempt.
    files: ['**/*.{tsx,jsx}'],
    ignores: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'app/error.tsx', // error.tsx must work without server-side i18n; bilingual fallback is hardcoded by design (D-30 / 06-RESEARCH.md §16)
      'app/dev/**', // dev-only diagnostic routes — never reachable in production (NODE_ENV gate, Plan 11-05 D-11)
      // Vendor code imported verbatim from the ReUI registry (Base UI / Maia / Neutral preset).
      // These ship with English demo copy and are re-imported on upgrade, so house i18n rules
      // are enforced at the call sites that use them, not inside the vendored source itself.
      'src/components/ui/**',
      'src/components/reui/**',
      'src/components/blocks/**',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[a-zA-ZÀ-ÿ]{2,}/]',
          message:
            'Hardcoded text in JSX is forbidden (SHELL-06 / D-26). Wrap user-facing strings in t(key, lang) — see src/lib/i18n/dictionaries.ts.',
        },
        {
          // SHELL-09 belt-and-suspenders: forbid Intl.NumberFormat()/Intl.DateTimeFormat()
          // with zero arguments (which silently uses the runtime locale).
          selector:
            'NewExpression[callee.object.name="Intl"][callee.property.name=/^(NumberFormat|DateTimeFormat)$/][arguments.length=0]',
          message:
            'Intl.NumberFormat / Intl.DateTimeFormat require an explicit locale (SHELL-09). Use formatCurrency / formatNumber / formatDate from @/lib/i18n/format.',
        },
      ],
    },
  },
  {
    // Allow @react-pdf/renderer imports only inside the PDF rendering module.
    // All other app code must go through renderProposalPdf() from '@/lib/pdf'.
    //
    // no-restricted-syntax is also disabled here: the short bilingual inline
    // strings in ProposalDocument (e.g., 'Société'/'Company') are intentional
    // PDF-only literals. They are not app UI strings — they don't go through
    // the runtime t() path. Per plan 08-05 planner discretion D-A3 / T-08-05-07.
    files: ['src/lib/pdf/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Allow exceljs imports only inside the XLSX adapter directory.
    // All other app code must go through generateProposalsXlsx() from '@/lib/xlsx'.
    // no-restricted-syntax is also off: xlsx adapter has no JSX text literals. (D-02)
    files: ['src/lib/xlsx/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Honor the leading-underscore convention for intentionally-unused identifiers
    // (e.g. destructured props kept for API shape: `fullWidth: _fullWidth`). Strictly
    // more lenient than the next/typescript default — only ignores `^_`-prefixed names.
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default config;
