import { logger } from "@workspace/shared/logger";

import { env } from "./env";

import type { EmailProviderStrategy } from "../types";

const from = env.EMAIL_FROM;

export const strategy = {
  send: async ({ to, subject, html, text }) => {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": env.POSTMARK_API_KEY,
      },
      body: JSON.stringify({
        From: from,
        To: to,
        Subject: subject,
        HtmlBody: html,
        TextBody: text,
      }),
    });

    if (!response.ok) {
      logger.error(await response.json());
      throw new Error("Could not send email!");
    }
  },
} satisfies EmailProviderStrategy;
