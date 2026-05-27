export const es = {
  common: async () => {
    await import("dayjs/locale/es");
    return import("./common.json");
  },
  auth: () => import("./auth.json"),
  billing: () => import("./billing.json"),
  marketing: () => import("./marketing.json"),
  organization: () => import("./organization.json"),
  admin: () => import("./admin.json"),
  dashboard: () => import("./dashboard.json"),
  validation: () => import("./validation.json"),
} as const;
