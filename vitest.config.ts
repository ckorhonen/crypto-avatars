import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        ENVIRONMENT: 'test',
        DEFAULT_AVATAR_BASE_URL: 'https://api.dicebear.com/7.x/identicon/svg',
        MAX_AVATAR_SIZE: '2048',
      },
      kvNamespaces: ['AVATAR_CACHE', 'SESSION_CACHE', 'NONCE_CACHE', 'RATE_LIMIT_CACHE'],
    },
  },
});