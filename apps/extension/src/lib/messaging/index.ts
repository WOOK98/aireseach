import { defineExtensionMessaging } from "@webext-core/messaging";

export const Message = {
  HELLO: "hello",
} as const;

export type Message = (typeof Message)[keyof typeof Message];

interface Messages {
  [Message.HELLO]: (filename: string) => string;
}

// eslint-disable-next-line @typescript-eslint/unbound-method
export const { onMessage, sendMessage } = defineExtensionMessaging<Messages>();
