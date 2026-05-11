// Phase 11 — DOM testing setup.
// Registers @testing-library/jest-dom custom matchers (toBeInTheDocument, toHaveAttribute, etc.)
// on Vitest's expect. Loaded by vitest.config.ts via `setupFiles`.
import '@testing-library/jest-dom/vitest';
