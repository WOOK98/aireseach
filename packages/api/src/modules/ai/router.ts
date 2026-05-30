import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";

import { enforceAuth } from "../../middleware";

import type { UIMessage } from "ai";

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export const aiRouter = new Hono().post("/chat", enforceAuth, async (c) => {
  const { messages }: { messages: UIMessage[] } = await c.req.json();

  return streamText({
    model: deepseek("deepseek-chat"),
    messages: await convertToModelMessages(messages),
    system: "You are a helpful AI assistant for business research.",
  }).toUIMessageStreamResponse();
});
