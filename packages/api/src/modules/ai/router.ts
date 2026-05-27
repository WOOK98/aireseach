import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";

import { enforceAuth } from "../../middleware";

import type { UIMessage } from "ai";

export const aiRouter = new Hono().post("/chat", enforceAuth, async (c) => {
  const { messages }: { messages: UIMessage[] } = await c.req.json();

  return streamText({
    model: openai.responses("gpt-4.1-nano"),
    messages: await convertToModelMessages(messages),
  }).toUIMessageStreamResponse();
});
