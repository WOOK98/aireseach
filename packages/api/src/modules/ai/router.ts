import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { env } from "../../env";
import { enforceAuth } from "../../middleware";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const deepseek = createOpenAI({
  apiKey: env.DEEPSEEK_API_KEY || env.LLM_API_KEY || env.OPENAI_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export const aiRouter = new Hono().post("/chat", enforceAuth, async (c) => {
  const apiKey = env.DEEPSEEK_API_KEY || env.LLM_API_KEY || env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new HTTPException(500, {
      message:
        "AI chat is not configured. Please set DEEPSEEK_API_KEY in the deployment environment.",
    });
  }

  const { messages }: { messages?: ChatMessage[] } = await c.req.json();

  if (!messages?.length) {
    throw new HTTPException(400, {
      message: "No chat messages were provided.",
    });
  }

  return streamText({
    model: deepseek("deepseek-chat"),
    messages: messages.map((message) => ({
      role: message.role,
      content: message.text,
    })),
    system: "You are a helpful AI assistant for business research.",
  }).toTextStreamResponse();
});
