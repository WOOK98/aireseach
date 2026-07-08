import { zValidator } from "@hono/zod-validator";
import { env } from "hono/adapter";
import { createMiddleware } from "hono/factory";

import { getAllRolesAtOrAbove, hasAdminPermission } from "@workspace/auth";
import { MemberRole } from "@workspace/auth";
import { auth } from "@workspace/auth/server";
import { makeZodI18nMap } from "@workspace/i18n";
import { getLocaleFromRequest, getTranslation } from "@workspace/i18n/server";
import { HttpStatusCode, NodeEnv } from "@workspace/shared/constants";
import { HttpException } from "@workspace/shared/utils";

import type { Permissions, User } from "@workspace/auth";
import type { TFunction } from "@workspace/i18n";
import type { ValidationTargets } from "hono";
import type { $ZodRawIssue, $ZodType } from "zod/v4/core";

/**
 * Reusable middleware that enforces users are logged in before running the
 * procedure
 */
export const enforceAuth = createMiddleware<{
  Variables: {
    user: User;
  };
}>(async (c, next) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const user = session?.user ?? null;

    if (!user) {
      throw new HttpException(HttpStatusCode.UNAUTHORIZED, {
        code: "error.unauthorized",
      });
    }

    c.set("user", user);
    await next();
  } catch (error) {
    if (error instanceof HttpException) throw error;
    // Session cookie decryption failed (e.g. after secret rotation)
    throw new HttpException(HttpStatusCode.UNAUTHORIZED, {
      code: "error.unauthorized",
    });
  }
});

/**
 * Reusable middleware that enforces that the authenticated user
 * has global admin permissions
 */
export const enforceAdmin = createMiddleware<{
  Variables: {
    user: User;
  };
}>(async (c, next) => {
  const user = c.var.user;

  if (!hasAdminPermission(user)) {
    throw new HttpException(HttpStatusCode.FORBIDDEN, {
      code: "error.forbidden",
    });
  }

  await next();
});

/**
 * Reusable middleware that enforces that the authenticated user
 * has the specified permissions in the user scope
 */
export const enforceUserPermission = ({
  permissions,
}: {
  permissions: Permissions;
}) =>
  createMiddleware<{ Variables: { user: User } }>(async (c, next) => {
    const hasPermission = await auth.api.hasPermission({
      body: {
        permissions,
      },
      headers: c.req.raw.headers,
    });

    if (!hasPermission.success) {
      throw new HttpException(HttpStatusCode.FORBIDDEN, {
        code: "error.forbidden",
      });
    }

    await next();
  });

/**
 * Middleware to enforce that the authenticated user has the required permissions
 * for a given organization before allowing access to the route handler.
 */
export const enforceOrganizationPermission = ({
  organizationId,
  permissions,
}: {
  organizationId?: string;
  permissions: Permissions;
}) =>
  createMiddleware<{
    Variables: {
      user: User;
    };
  }>(async (c, next) => {
    const hasPermission = await auth.api.hasPermission({
      body: {
        organizationId,
        permissions,
      },
      headers: c.req.raw.headers,
    });

    if (!hasPermission.success) {
      throw new HttpException(HttpStatusCode.FORBIDDEN, {
        code: "error.forbidden",
      });
    }

    await next();
  });

/**
 * Middleware to enforce that the authenticated user is at least a member
 * of the given organization before allowing access to the route handler.
 */
export const enforceMembership = ({
  organizationId,
  role = MemberRole.MEMBER,
}: {
  organizationId: string;
  role?: MemberRole;
}) =>
  createMiddleware<{
    Variables: {
      user: User;
    };
  }>(async (c, next) => {
    const user = c.var.user;
    try {
      const { members } = await auth.api.listMembers({
        query: {
          organizationId,
          filterField: "userId",
          filterValue: user.id,
          filterOperator: "eq",
        },
        headers: c.req.raw.headers,
      });

      const member = members.find((member) => member.userId === user.id);

      if (!member || !getAllRolesAtOrAbove(role).includes(member.role)) {
        throw new HttpException(HttpStatusCode.FORBIDDEN, {
          code: "error.forbidden",
        });
      }
    } catch {
      throw new HttpException(HttpStatusCode.FORBIDDEN, {
        code: "error.forbidden",
      });
    }

    await next();
  });

/**
 * Middleware for adding an articifial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
export const delay = createMiddleware<{
  Bindings: {
    NODE_ENV: string;
  };
}>(async (c, next) => {
  if (env(c).NODE_ENV === NodeEnv.DEVELOPMENT) {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  await next();
});

/**
 * Middleware for setting the language based on the cookie and accept-language header.
 */
export const localize = createMiddleware<{
  Variables: {
    locale: string;
  };
}>(async (c, next) => {
  const locale = getLocaleFromRequest(c.req.raw);
  c.set("locale", locale);
  await next();
});

/**
 * Middleware for validating the request input using Zod.
 */
export const validate = <
  T extends $ZodType,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) =>
  zValidator(target, schema, async (result, c) => {
    if (!result.success) {
      const { t } = await getTranslation({
        locale:
          "locale" in c.var && typeof c.var.locale === "string"
            ? c.var.locale
            : getLocaleFromRequest(c.req.raw),
      });
      const error = result.error.issues[0];

      if (!error) {
        throw new HttpException(HttpStatusCode.UNPROCESSABLE_ENTITY);
      }

      const { message, code } = makeZodI18nMap({ t: t as TFunction })(
        error as $ZodRawIssue,
      );

      throw new HttpException(HttpStatusCode.UNPROCESSABLE_ENTITY, {
        code,
        message,
      });
    }
  });
