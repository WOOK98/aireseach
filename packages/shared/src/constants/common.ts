export const NodeEnv = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;

export const SortOrder = {
  ASCENDING: "asc",
  DESCENDING: "desc",
} as const;

export const Platform = {
  WEB: "web",
  MOBILE: "mobile",
  EXTENSION: "extension",
} as const;

export const ExecutionSide = {
  CLIENT: "client",
  SERVER: "server",
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export const envConfig = {
  skip:
    (!!process.env.SKIP_ENV_VALIDATION &&
      ["1", "true"].includes(process.env.SKIP_ENV_VALIDATION)) ||
    ["postinstall", "lint"].includes(process.env.npm_lifecycle_event ?? ""),
} as const;
