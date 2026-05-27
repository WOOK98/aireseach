import { logger } from "@workspace/shared/logger";

import { env } from "./env";

import type { EmailProviderStrategy } from "../types";

const from = env.EMAIL_FROM;

export const strategy = {
  send: async ({ to, subject, html, text }) => {
    const response = await fetch("https://api.useplunk.com/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PLUNK_API_KEY}`,
      },
      body: JSON.stringify({
        to,
        from,
        subject,
        body: html,
        text,
      }),
    });

    if (!response.ok) {
      logger.error(await response.json());
      throw new Error("Could not send email!");
    }
  },
} satisfies EmailProviderStrategy;
