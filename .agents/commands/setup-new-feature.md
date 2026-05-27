# Setup New Feature

Set up a new feature in the Turbostarter monorepo following project conventions.

## Before starting

1. **Clarify scope**: Which apps need this feature? (web, mobile, extension, or all)
2. **Check existing code**: Look in `packages/*` for reusable logic before creating new code
3. **Identify shared vs app-specific**: Shared logic goes in `packages/*`, UI in app-specific modules

## Feature setup by target

### Web feature (`apps/web`)

1. **Page/route**: Create in `src/app/[locale]/{section}/`
   - Marketing pages → `(marketing)/`
   - Auth pages → `auth/`
   - Dashboard pages → `dashboard/`
   - Admin pages → `admin/`

2. **Module**: Create in `src/modules/{feature}/`
   ```
   src/modules/{feature}/
     components/     # React components
     lib/            # Hooks, utils, API calls
     index.ts        # Public exports
   ```

3. **Use RSC by default**: Only add `use client` when necessary

### Mobile feature (`apps/mobile`)

1. **Screen**: Create in `src/app/`
   - Setup/onboarding → `(setup)/`
   - Main app → `dashboard/`

2. **Module**: Create in `src/modules/{feature}/`
   ```
   src/modules/{feature}/
     components/     # React Native components
     lib/            # Hooks, utils, API calls
     index.ts        # Public exports
   ```

3. **Remember**: SafeAreaView, memoization, `@workspace/ui-mobile`

### Extension feature (`apps/extension`)

1. **Entry point**: Add to `src/app/` if new entry needed
2. **Module**: Create in `src/modules/{feature}/`
3. **Background vs content**: Long tasks → background, DOM → content scripts

### Shared logic (`packages/*`)

If the feature needs shared logic across apps:

| Need                  | Package                    | Location                          |
| --------------------- | -------------------------- | --------------------------------- |
| API endpoint          | `@workspace/api`           | `packages/api/src/modules/`       |
| Database schema       | `@workspace/db`            | `packages/db/src/schema/`         |
| Auth logic            | `@workspace/auth`          | `packages/auth/src/`              |
| Shared types/utils    | `@workspace/shared`        | `packages/shared/src/`            |
| Translations          | `@workspace/i18n`          | `packages/i18n/src/translations/` |
| Email templates       | `@workspace/email`         | `packages/email/src/templates/`   |

## Checklist

- [ ] Scope defined (which apps)
- [ ] Checked `packages/*` for existing helpers
- [ ] Created module structure in target app(s)
- [ ] Added shared logic to appropriate package (if needed)
- [ ] Used correct UI package (`@workspace/ui-web` or `@workspace/ui-mobile`)
- [ ] Added translations if user-facing text
- [ ] Types explicit, no `any`
- [ ] Zod schemas for validation

## After setup

1. Run `pnpm typecheck` to verify types
2. Run `pnpm lint` to check code style
3. Test the feature in dev: `pnpm --filter <app> dev`
