import { logger } from "@workspace/shared/logger";

import { env } from "./env";

import type { EmailProviderStrategy } from "../types";

const from = env.EMAIL_FROM;

export const strategy = {
  send: async ({ to, subject, html, text }) => {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        from: { email: from },
        personalizations: [
          {
            to: [{ email: to }],
          },
        ],
        subject,
        content: [
          {
            type: "text/plain",
            value: text,
          },
          {
            type: "text/html",
            value: html,
          },
        ],
      }),
    });

    if (!response.ok) {
      logger.error(await response.json());
      throw new Error("Could not send email!");
    }
  },
} satisfies EmailProviderStrategy;
