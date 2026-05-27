import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";

import { HttpStatusCode } from "@workspace/shared/constants";
import { HttpException } from "@workspace/shared/utils";

import { env } from "../env";

const MAX_WEBHOOK_AGE_SECONDS = 5 * 60; // 5 minutes

export const verifySignature = async (headers: Headers, body: string) => {
  const msgId = headers.get("svix-id");
  const msgTimestamp = headers.get("svix-timestamp");
  const msgSignature = headers.get("svix-signature");

  if (!msgId || !msgTimestamp || !msgSignature) {
    throw new HttpException(HttpStatusCode.BAD_REQUEST, {
      code: "billing:error.webhook.signatureNotFound",
    });
  }

  const timestamp = Number(msgTimestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (
    !Number.isFinite(timestamp) ||
    Math.abs(nowSeconds - timestamp) > MAX_WEBHOOK_AGE_SECONDS
  ) {
    throw new HttpException(HttpStatusCode.BAD_REQUEST, {
      code: "billing:error.webhook.timestampInvalid",
    });
  }

  const signedContent = `${msgId}.${msgTimestamp}.${body}`;
  const secretPart = env.SUPERWALL_WEBHOOK_SECRET.split("_")[1];

  if (!secretPart) {
    throw new HttpException(HttpStatusCode.BAD_REQUEST, {
      code: "billing:error.webhook.invalidSignature",
    });
  }

  const secretBytes = Buffer.from(secretPart, "base64");

  const key = await webcrypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await webcrypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent),
  );

  const computed = Buffer.from(new Uint8Array(signatureBuffer)).toString(
    "base64",
  );

  const expected = `v1,${computed}`;
  const passed = msgSignature.split(" ");

  const matches = passed.some((sig) => {
    return timingSafeEqual(sig, expected);
  });

  if (!matches) {
    throw new HttpException(HttpStatusCode.BAD_REQUEST, {
      code: "billing:error.webhook.invalidSignature",
    });
  }
};

const timingSafeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};
