# AGENTS.md

Guide for AI agents working on the Turbostarter monorepo.

## Agent rules

**DO:**

- Read existing files before editing; understand imports and structure first
- Keep diffs minimal and scoped to the request
- Use `pnpm --filter <pkg>` for package-specific commands
- Use `pnpm with-env` for commands needing environment variables
- Add dependencies via `pnpm add -F <pkg>` in the appropriate package
- Follow existing code style, naming, and file layout
- Use explicit types; prefer `interface` over `type` for objects
- Use Zod for validation
- Check `packages/*` for shared helpers before duplicating logic
- Import from package entry points (`@workspace/ui-web`, not deep paths)

**DON'T:**

- Commit, push, or modify git state unless explicitly asked
- Run destructive commands (`reset --hard`, force-push) without permission
- Invent ad-hoc scripts; use repo commands from the table below
- Reformat unrelated code or make drive-by changes
- Delete or rewrite unrelated code
- Use `any` or unsafe type casts
- Use enums (prefer maps/objects)
- Use classes (prefer functions)

## Where to look first

| Task              | Start here                                  |
| ----------------- | ------------------------------------------- |
| Auth logic        | `packages/auth/` → then app-specific usage  |
| API endpoints     | `packages/api/src/modules/`                 |
| Database schema   | `packages/db/src/schema/`                   |
| UI components     | `packages/ui/web/` or `packages/ui/mobile/` |
| Billing           | `packages/billing/{shared,web,mobile}/`     |
| Translations      | `packages/i18n/src/translations/`           |
| Email templates   | `packages/email/src/templates/`             |
| Web pages         | `apps/web/src/app/[locale]/`                |
| Mobile screens    | `apps/mobile/src/app/`                      |
| Extension entries | `apps/extension/src/app/`                   |

## Project structure

```
apps/
  web/         Next.js App Router (src/app/[locale]/{(marketing),auth,dashboard,admin})
  mobile/      Expo Router (src/app/{(setup),dashboard}, src/modules/)
  extension/   WXT + React (src/app/{background,content,popup,options,sidepanel,...})

packages/
  api/         @workspace/api       Hono modules (admin,ai,auth,billing,organization,storage)
  auth/        @workspace/auth      Better Auth server + clients (web.ts, mobile.ts)
  billing/     @workspace/billing   Shared + web (Stripe,LemonSqueezy,Polar) + mobile (RevenueCat,Superwall)
  cms/         @workspace/cms       MDX content (blog, legal)
  db/          @workspace/db        Drizzle schema, migrations, scripts
  email/       @workspace/email     React Email templates + providers
  i18n/        @workspace/i18n      Translations + server/client utils
  shared/      @workspace/shared    Constants, schema, logger, hooks, utils
  storage/     @workspace/storage   S3 storage providers
  analytics/   @workspace/analytics[-web|-mobile|-extension]
  monitoring/  @workspace/monitoring[-web|-mobile|-extension]
  ui/          @workspace/ui[-web|-mobile]

tooling/       ESLint, Prettier, TypeScript configs
```

## Commands

| Task               | Command                                                    |
| ------------------ | ---------------------------------------------------------- |
| Install deps       | `pnpm install`                                             |
| Dev (all/specific) | `pnpm dev` / `pnpm --filter <app> dev`                     |
| Build              | `pnpm build` / `pnpm --filter <app> build`                 |
| Mobile run         | `pnpm --filter mobile ios` / `android`                     |
| Extension build    | `pnpm --filter extension build:chrome` / `build:firefox`   |
| Lint/Format        | `pnpm lint` / `pnpm format`                                |
| Fix lint/format    | `pnpm lint:fix` / `pnpm format:fix`                        |
| Test               | `pnpm test`                                                |
| Clean              | `pnpm clean`                                               |
| Services           | `pnpm services:setup` / `services:start` / `services:stop` |
| DB migrate         | `pnpm with-env pnpm -F @workspace/db db:migrate`           |
| DB generate        | `pnpm with-env pnpm -F @workspace/db db:generate`          |
| DB studio          | `pnpm with-env pnpm -F @workspace/db db:studio`            |

Environment: create `.env` at repo root with `DATABASE_URL`, `PRODUCT_NAME`, `URL`, `DEFAULT_LOCALE`.

## Code conventions

- TypeScript: functional, declarative; no classes
- Naming: `isLoading`, `hasError`, `handleClick`
- File layout: exported component → subcomponents → helpers → types
- Error handling: guard clauses, early returns
- JSX: declarative, minimal curly braces
- Commits: Conventional Commits

## App-specific

**Web:** RSC by default; `use client` only when needed; `Suspense` for client components; `nuqs` for URL state; `@workspace/ui-web`

**Mobile:** SafeAreaProvider; minimize hooks; memoize; `expo-image`; `@workspace/ui-mobile`

**Extension:** background for long tasks; content scripts for DOM; WXT messaging; `@workspace/ui-web`

## Troubleshooting

| Issue            | Fix                                          |
| ---------------- | -------------------------------------------- |
| Version mismatch | Check `package.json#packageManager`          |
| Services refused | `pnpm services:start`, verify Docker running |
| Env not loaded   | Create `.env` at root; use `pnpm with-env`   |
| Module issues    | `pnpm clean && pnpm install`                 |
