import { defineConfig } from 'vitest/config';
import shared from './vitest.config.js';

export default defineConfig({
  ...shared,
  test: {
    ...shared.test,
    include: ['tests/**/*.release.spec.{ts,tsx}'],
    exclude: ['**/node_modules/**'],
  },
});
