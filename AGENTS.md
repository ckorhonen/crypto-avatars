# Crypto Avatars

## Current Repository Reality

- The executable implementation is an Express application: `src/server.ts` starts `src/app.ts`; `src/controllers/avatar.ts` owns avatar routes; `prisma/schema.prisma` defines PostgreSQL persistence; Docker Compose supplies PostgreSQL and Redis for local development.
- The README's Cloudflare Worker, Wrangler, KV, and R2 setup is not backed by committed Worker or Wrangler files. Treat it as stale design material, not an executable deployment guide, until a scoped implementation reconciles it with the Express/Prisma source.
- The manifest requires Node 18+ and npm 9+. It has no committed lockfile, so use `npm install` rather than `npm ci` for an exploratory dependency setup. `npm run dev` points to missing `src/index.ts`; `npm start` points to `dist/index.js` although the committed `src/server.ts` entry emits `dist/server.js`; and Jest is configured for an absent `tests/` directory. Do not claim a clean dev server, start command, or test pass from the declared scripts without first repairing those source/manifest gaps within an authorized task.

## Safe Work Boundaries

- `npm run build` compiles the TypeScript source when dependencies are available. `prisma:generate` writes generated client code; `prisma:migrate` changes the configured database; Docker Compose creates local services and named volumes. Read the relevant source and confirm the target database before running any of those stateful commands.
- The source uses database, Redis, blockchain RPC, IPFS, storage, JWT, and webhook configuration. Keep their values out of source, logs, and chat. A local or container check cannot prove wallet authentication, external RPC/IPFS behavior, or any future deployment.
- Complete authorized changes through the relevant runnable checks, repair failures caused by the change, and use focused regression coverage when it helps. Report baseline blockers and actual checks; routine reversible choices do not need repeated confirmation.
