import { logger } from "@workspace/shared/logger";

import { env } from "./env";

import type { EmailProviderStrategy } from "../types";

const from = env.EMAIL_FROM;

export const strategy = {
  send: async ({ to, subject, html, text }) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      logger.error(await response.json());
      throw new Error("Could not send email!");
    }
  },
} satisfies EmailProviderStrategy;
