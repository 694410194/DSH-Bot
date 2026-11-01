import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Each workspace package runs this shared config from its own directory.
  root: process.cwd(),
  test: {
    environment: 'node',
    // Suites use durable JSON/fsync and subprocesses. Bound parallel disk load
    // so CPU count does not turn short workflow waits into false failures.
    maxWorkers: 2,
    // Public platform atoms are supplied by DSH in production. The published
    // rc.2 primitives Node entry has undeclared browser-only dependencies.
    setupFiles: ['./tests/client/platform.setup.ts'],
    include: ['{src,tests}/**/*.{test,spec}.{ts,tsx}'],
    // Historical artifact checks have strict fixture prerequisites; never silently skip them.
    exclude: ['**/*.release.spec.{ts,tsx}', '**/node_modules/**'],
  },
});
