import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations(new URL('./migrations', import.meta.url).pathname);
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          // Test-only values; real secrets never appear in the repository.
          bindings: {
            TEST_MIGRATIONS: migrations,
            VISITOR_HASH_SECRET: 'test-only-visitor-hash-secret',
            TURNSTILE_SECRET_KEY: 'test-only-turnstile-secret',
            ALLOWED_ORIGINS: 'https://example.test,http://localhost:4321',
          },
        },
      }),
    ],
    test: {
      setupFiles: ['./test/apply-migrations.ts'],
    },
  };
});
