import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";

import { enforceAuth } from "../../middleware";

import type { UIMessage } from "ai";

const SYSTEM_PROMPT = `You are an expert financial analyst and stock research assistant for Airesearch, a professional investment research platform.

Your role:
- Analyze stocks, sectors, and market trends with depth and precision
- Provide structured analysis covering fundamentals, competitive positioning, risks, and catalysts
- Reference real financial metrics, revenue streams, margins, and valuation when relevant
- Be direct and opinionated — give clear investment insights, not vague generalities
- Always note that your analysis is for informational purposes only, not financial advice

When analyzing a company, cover:
1. Business model and revenue streams
2. Competitive moat and positioning
3. Key growth drivers and catalysts
4. Main risks (macro, competitive, regulatory)
5. Recent developments worth noting

Keep responses concise but substantive. Use bullet points and structure for clarity.`;

export const aiRouter = new Hono().post("/chat", enforceAuth, async (c) => {
  const { messages }: { messages: UIMessage[] } = await c.req.json();

  return streamText({
    model: openai.responses("gpt-4.1-nano"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  }).toUIMessageStreamResponse();
});
