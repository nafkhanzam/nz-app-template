Ideas, grouped. Based on CLAUDE.md, git status, and `main.ts`/`context.ts` skim — not a full audit.

## Bugs / smells seen

- `main.ts` request-logger middleware compute `body`, never use it. Dead code. Log it or delete.
- `/api/model` 401 only if header present. No header → pass through as anon. OK if policies deny anon, but verify every model policy default-deny.
- Token sent bare, not `Bearer`. Non-standard; breaks proxies/tools/OpenAPI. Switch to `Bearer`.
- `cors({})` = allow all origins. Restrict via env `APP_CORS_ORIGINS`.
- `express.json()` default limit; set explicit limit.
- Generated `schema.ts`/`models.ts`/`input.ts` modified in git. Decide: commit or gitignore + generate in CI. Pick one, stop diff churn.
- Web `src/lib/zenstack/` and `src/lib/shared/` copies of server code. Drift risk. Make a `packages/shared` workspace instead.
- Migration dir `20261030163704_sync_xam2` — name vague. Squash/rename before template release.

## Security

- Add `helmet`, rate limit (`express-rate-limit`) on `/trpc/login`, `register`, `refresh`, `password`.
- Login lockout / backoff, constant-time compare, timing-safe user enumeration on login/register/reset.
- Refresh token rotation + reuse detection (RefreshToken model exists — revoke whole family on reuse).
- Hash refresh tokens in DB (store SHA-256, not raw).
- Store refresh token in httpOnly cookie, not JS store (XSS).
- `impersonate`: audit log mandatory, short-lived token, banner in UI, block impersonating admin.
- S3 upload: enforce max size + content-type in presigned POST policy (not PUT), virus scan hook, filename sanitize.
- JWT: add `kid` + key rotation, `aud`/`iss` check, min secret length check at boot.
- Env validation at boot with zod (server has `env.ts`; ensure fail-fast, no defaults for secrets).
- Add CSP headers on web hosting; `Referrer-Policy`, etc.
- Dependabot/Renovate + `pnpm audit` in CI. Secret scanning (gitleaks).
- Password policy + HIBP k-anonymity check; optional 2FA (TOTP) + passkeys.
- Email verification + password reset flow (check `password.ts` covers it).

## Server architecture

- Structured logger (pino) w/ request id, user id, duration; propagate id to client via header.
- Graceful shutdown (SIGTERM: close server, drain, `db.$disconnect`).
- `/health` split into `/live` and `/ready` (DB + S3 ping).
- Global error mapper: ZenStack `ORMError` → tRPC codes (policy denied → FORBIDDEN, not found → NOT_FOUND).
- Input validation: zod on every procedure; shared schemas.
- Pagination/cursor helpers; default `take` cap on crud routes to prevent huge reads.
- Background jobs (pg-boss / graphile-worker) — uses Postgres, no Redis. Cleanup expired RefreshTokens, orphan `File` rows (PENDING never confirmed).
- Cron cleanup for stale uploads + S3 lifecycle rule.
- OpenTelemetry tracing + Prometheus `/metrics`. Sentry on both apps.
- Audit log: auto-write via ZenStack `onEntityMutation` plugin instead of manual `auditLog` helper calls.
- Soft delete mixin in zmodel (`deletedAt`) + policy `@@deny` on deleted.
- `createdAt/updatedAt` mixin in zmodel reused everywhere.
- Multi-tenancy / orgs + roles as optional zmodel module.
- Idempotency keys for mutations (upload confirm, payments).
- Websocket/SSE subscription (tRPC subscriptions) for live updates; `events.ts` is a start.
- OpenAPI via `trpc-openapi` or ZenStack OpenAPI plugin for non-TS clients.
- Replace `tsx watch` prod? Ensure prod runs compiled `dist` (already `tsc`). Add `node --enable-source-maps`.
- i18n for server error messages (codes, not strings).

## Web

- Route guards: central `+layout.ts` auth check, not per page; redirect with `?next=`.
- Typed query-key factory; centralized TanStack Query error toast handler.
- Global error boundary (`svelte:boundary`) + `+error.svelte` per group.
- Form lib: `sveltekit-superforms` + zod, or at least shared form components with error display.
- Toast/modal service (DaisyUI) singleton.
- Skeleton loaders, empty states, optimistic updates.
- i18n (paraglide-js) — user speaks Indonesian/English probably.
- Dark mode: `theme` store exists; honor `prefers-color-scheme` w/ no flash (inline script in `app.html`).
- A11y pass: `svelte-check` a11y warnings as errors; axe in Playwright.
- PWA/offline for QrScanner use case.
- Lazy-load heavy libs: `xlsx`, QR scanner via dynamic `import()` (bundle size). `xlsx` npm is abandoned/vulnerable → use `exceljs` or SheetJS CDN build.
- `csv.ts`, `xlsx.ts`, `download.ts`, `report.ts` → consolidate into one export module with common interface.
- `date-format.ts`: use `Intl.DateTimeFormat` + user timezone setting; store UTC.
- QrScanner: camera permission error UX, torch toggle, cleanup stream on destroy (check `onDestroy`/attachment).
- Token refresh mutex good; add cross-tab sync (`BroadcastChannel`) so tabs don't double-refresh/logout.
- Preload data on hover (`data-sveltekit-preload-data`).
- Bundle analyzer (`rollup-plugin-visualizer`), Lighthouse CI.

## Testing

- Server: Vitest + testcontainers Postgres; test policies per role (policy matrix tests are highest value).
- tRPC procedure integration tests via `createCaller`.
- Playwright: auth fixture (storageState), seed DB per run, CI job.
- Unit tests for `my-fetch` refresh race.
- Coverage threshold gate.
- Snapshot test: generated zenstack up to date (`pnpm generate && git diff --exit-code`).

## DX / Tooling

- Lint: ESLint (typescript-eslint strict, no `any`, per your rule) + `eslint-plugin-svelte` on both apps; `pnpm lint` currently only prettier on web.
- Root `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm check` (all).
- Husky/lefthook: pre-commit typecheck+lint-staged, commit-msg conventional commits.
- Turborepo/nx for cached task graph; `pnpm -r --parallel` minimum.
- `.nvmrc`/`engines` + `packageManager` field, `corepack`.
- Devcontainer / `mise.toml` pinning node, pnpm, sops, age.
- `./cli` → add `doctor` (check sops key, docker up, ports, node version), `reset-db`, `new-migration`, `new-fn <name>` scaffold generator.
- Plop/`pnpm gen:page`, `gen:model` scaffolds. Template-specific: `pnpm init-project <name>` script that renames package names, app names, ports, README.
- Seed script: idempotent, faker-based, profiles (minimal/demo/load).
- `.env` typed access: server `env.ts` and web `env.ts` generate `envs/template.yaml` automatically from zod schema so no drift.
- README: quickstart in 5 commands, architecture diagram, "how to add a feature" walkthrough, deploy guide.
- ADRs folder for choices (ZenStack v3, tRPC+RPC dual API).
- Storybook/histoire for components (optional).
- VSCode `.vscode/` settings, recommended extensions, launch configs (debug server).

## CI/CD / Deploy

- CI workflow on PR: install (cached), typecheck, lint, test, build both, zenstack-generate diff check.
- Deploy workflows: add concurrency groups, environment protection, health-check after deploy, auto rollback on failed health check (rollback workflows exist — wire automatic).
- Docker: multi-stage, non-root user, `pnpm deploy --prod` for slim server image, `HEALTHCHECK`, `.dockerignore`, pin base digest, build cache (buildx gha).
- Run `migrate deploy` as separate release step/init job, not on app boot with multi replicas (advisory lock).
- Web Dockerfile builds from `ENV_FILE` arg written to `.env` — secrets in image layers risk. Pass only `PUBLIC_*` as build args.
- SBOM + image scan (trivy).
- Preview environments per PR.
- Backups: pg_dump cron to S3 + restore drill doc.
- `docker-compose.services.yml`: add Mailpit (email testing), healthchecks, named volumes, pinned versions; MinIO bucket auto-create init container.
- Add email module (nodemailer/Resend) w/ templates (react-email or mjml) — likely needed by verify/reset.

## Template-ness

- Strip app-specific stuff (`user-events`, `reports`, `QrScanner`, xam sync) into optional "example module" branch/dir so template stays clean; or feature flags.
- Provide `CHANGELOG` + release tags; `degit`/GitHub "template repository" setting.
- Keep a `TEMPLATE_CHECKLIST.md` of things to replace on fork (names, secrets, domains, icons, manifest).
- Update-from-upstream strategy (`git merge template/main` doc).

## Top 8 to do first (my pick)

1. Rate limit + helmet + CORS restrict + `Bearer`.
2. Refresh token: hash in DB, rotation w/ reuse detection, httpOnly cookie.
3. Policy tests (Vitest + testcontainers).
4. CI: typecheck + lint + test + generate-diff.
5. ESLint strict no-`any`.
6. Shared package replacing `lib/shared` copies.
7. Graceful shutdown + ready/live health + pino.
8. Replace `xlsx` pkg + lazy-load export libs.

Want me to implement some? Name numbers or groups.
