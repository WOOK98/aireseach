import { logger } from "@workspace/shared/logger";

import { strategy } from "./providers";
import { getTemplate } from "./templates";

import type { EmailTemplate, EmailVariables } from "./types";

const sendEmail = async <T extends EmailTemplate>({
  to,
  template,
  locale,
  variables,
}: {
  to: string;
  template: T;
  variables: EmailVariables[T];
  locale?: string;
}) => {
  logger.info(`Sending email ${template} to ${to}`);

  try {
    const { html, text, subject } = await getTemplate({
      id: template,
      variables,
      locale,
    });

    const result = await strategy.send({ to, subject, html, text });
    logger.info(`Email sent successfully to ${to}`);

    return result;
  } catch (error) {
    logger.error(error, `Failed to send email ${template} to ${to}`);
    throw error;
  }
};

export { sendEmail };
