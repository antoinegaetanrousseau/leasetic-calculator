/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * CJS preload: mock 'server-only' in the require cache BEFORE anything loads it.
 * This is a .cjs file intentionally — it must use require() to inject into the
 * Node.js require cache before tsx registers its own transformer.
 *
 * Used by: tsx -r ./scripts/_preload-mock-server-only.cjs <script>
 *
 * Purpose: allows scripts/update-pdf-fixture.ts (and one-off hash generation)
 * to call renderProposalPdf() outside of Next.js server context without the
 * 'server-only' guard throwing.
 */
const nodePath = require('node:path');
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
  parent: null,
  children: [],
  path: nodePath.dirname(serverOnlyPath),
  paths: [],
};
