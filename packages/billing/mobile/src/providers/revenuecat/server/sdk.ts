import { createFetch } from "@better-fetch/fetch";

import { env } from "./env";

export const revenuecat = createFetch({
  baseURL: "https://api.revenuecat.com/v1",
  throw: true,
  headers: {
    "Content-Type": "application/json",
  },
  auth: {
    type: "Bearer",
    token: env.REVENUECAT_API_KEY,
  },
});
