# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (monorepo)
```bash
pnpm dev          # run both apps concurrently
pnpm typecheck    # typecheck all workspaces
```

### Server (`apps/server`)
```bash
pnpm dev                  # tsx watch src/main (hot reload)
pnpm build                # tsc compile
pnpm typecheck            # tsc --noEmit
pnpm generate             # regenerate ZenStack artifacts after .zmodel changes
pnpm db:push              # push schema without migration (dev only)
pnpm migrate:dev          # create + apply migration
pnpm migrate:deploy       # apply migrations in production
pnpm db:studio            # ZenStack studio UI
pnpm db:seed              # run src/scripts/seed.ts
```

### Web (`apps/web`)
```bash
pnpm dev          # Vite dev server
pnpm build        # production build
pnpm typecheck    # svelte-kit sync + svelte-check
pnpm lint         # prettier --check
pnpm format       # prettier --write
pnpm test         # Playwright e2e tests
pnpm test:ui      # Playwright UI mode
pnpm test:headed  # visible browser
```

### Local services
```bash
docker compose -f docker-compose.services.yml up -d   # Postgres + MinIO
```

## Architecture

Pnpm monorepo with two workspaces: `apps/server` and `apps/web`. Web imports server types directly via workspace link (`"server": "link:../server"`).

### Server (`apps/server`)

Express + tRPC + ZenStack v3 on PostgreSQL via Kysely.

- **`src/zenstack/`** — ZenStack schema files (`.zmodel`) and generated outputs (`schema.ts`, `models.ts`, `input.ts`). `core.zmodel` defines base types and core models (User, File, AuditLog, RefreshToken). `app.zmodel` has app-specific models. **Edit `.zmodel` files, then run `pnpm generate`.**
- **`src/db.ts`** — `ZenStackClient` (raw, no policies) as `db`; `authDb = db.$use(new PolicyPlugin())` enforces access policies. Always use `userDb` (context-scoped, auth set) inside tRPC handlers for policy-enforced queries.
- **`src/context.ts`** — tRPC context: extracts JWT from `Authorization` header, creates `userDb = authDb.$setAuth(user)`, provides `auditLog` helper.
- **`src/trpc.ts`** — `t` (public procedure), `tuser` (authenticated procedure that throws 401 if no user).
- **`src/router.ts`** — root `appRouter`; CRUD routes auto-generated via `createZenStackRouter(schema, t)` mounted at `crud`.
- **`src/main.ts`** — Express app. Routes: `/trpc` (tRPC), `/api/model` (ZenStack REST RPC), `/health`.
- **`src/functions/`** — individual tRPC procedures (login, register, me, refresh, oidc, file-upload, etc.).
- **`src/shared/`** — code shared with web (jwt utils, upload helpers). Symlinked/imported by web at `src/lib/shared/`.

### Web (`apps/web`)

SvelteKit (static adapter) + TailwindCSS v4 + DaisyUI + TanStack Query.

- **`src/lib/client.svelte.ts`** — two API clients:
  - `trpc` / `trpc_` — tRPC client using `myFetch` (auto-refreshes token on 401) / `myFetchNoRefresh`.
  - `client` — ZenStack v3 RPC client via `useClientQueries` hitting `/api/model`.
- **`src/lib/my-fetch.svelte.ts`** — fetch wrapper that intercepts 401s, refreshes access token via `trpc_.refresh`, retries. Uses a mutex to prevent concurrent refresh races.
- **`src/lib/stores/`** — Svelte 5 rune-based stores: `token` (access JWT), `refresh` (refresh JWT), `user`, `theme`.
- **`src/routes/(core)/(app)/`** — authenticated app shell with Navbar/Footer. `(admin)` sub-group for admin-only pages.
- **`src/lib/zenstack/`** — generated ZenStack client types (do not edit manually).

### Auth flow

JWT-based dual-token (access + refresh). OIDC login also supported. Access token sent as `Authorization` header (bare token, not `Bearer`). On 401, web auto-refreshes via `/trpc/refresh` mutation. ZenStack access policies use `auth()` which resolves from the token payload (no DB lookup per request).

### File uploads

Presigned S3 URLs: client calls `getUploadUrl` tRPC → gets presigned PUT URL → uploads directly to S3/MinIO → calls `confirmUpload` to mark `File.status = UPLOADED`.
