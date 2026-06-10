import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { stream } from "hono/streaming";

import { and, count, eq, gte } from "@workspace/db";
import { aiUsageLog } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

import { env } from "../../env";
import { enforceAuth } from "../../middleware";

type NormalizedChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RawMessagePart = {
  type?: string;
  text?: string;
};

type RawChatMessage = {
  role?: string;
  text?: string;
  content?: string;
  parts?: RawMessagePart[];
};

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

const openaiProvider = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const deepseekProvider = createOpenAI({
  apiKey: env.DEEPSEEK_API_KEY || env.LLM_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

const CHAT_DAILY_LIMIT = 20;
const CHAT_MAX_OUTPUT_TOKENS = 2048;

const getChatModel = () => {
  const apiKey = env.OPENAI_API_KEY || env.DEEPSEEK_API_KEY || env.LLM_API_KEY;

  if (!apiKey) {
    throw new HTTPException(500, {
      message:
        "AI chat is not configured. Set OPENAI_API_KEY or DEEPSEEK_API_KEY.",
    });
  }

  return env.OPENAI_API_KEY
    ? openaiProvider.responses("gpt-4.1-nano")
    : deepseekProvider.chat("deepseek-chat");
};

const getChatModelName = () =>
  env.OPENAI_API_KEY ? "gpt-4.1-nano" : "deepseek-chat";

const extractMessageText = (message: RawChatMessage) => {
  if (typeof message.text === "string") return message.text;
  if (typeof message.content === "string") return message.content;

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  }

  return "";
};

const normalizeMessage = (value: unknown): NormalizedChatMessage | null => {
  if (!value || typeof value !== "object") return null;

  const message = value as RawChatMessage;
  if (message.role !== "user" && message.role !== "assistant") return null;

  const content = extractMessageText(message).trim();
  if (!content) return null;

  return {
    role: message.role,
    content,
  };
};

const getTodayStart = () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return todayStart;
};

const getDailyChatCount = async (userId: string) => {
  try {
    const countResult = await db
      .select({ value: count() })
      .from(aiUsageLog)
      .where(
        and(
          eq(aiUsageLog.userId, userId),
          eq(aiUsageLog.feature, "chat"),
          gte(aiUsageLog.createdAt, getTodayStart()),
        ),
      );

    return countResult[0]?.value ?? 0;
  } catch {
    return null;
  }
};

const assertDailyChatLimit = async (userId: string) => {
  const chatCount = await getDailyChatCount(userId);
  if (chatCount === null) return;

  if (chatCount >= CHAT_DAILY_LIMIT) {
    throw new HTTPException(429, {
      message: `Daily chat limit reached (${CHAT_DAILY_LIMIT}/day). Try again tomorrow.`,
    });
  }
};

export const aiRouter = new Hono()
  .post("/chat/reserve", enforceAuth, async (c) => {
    const user = c.var.user;
    await assertDailyChatLimit(user.id);

    try {
      await db.insert(aiUsageLog).values({
        userId: user.id,
        feature: "chat",
        model: getChatModelName(),
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    } catch {
      // Usage tracking activates after the ai_usage_log migration is applied.
    }

    return c.json({ ok: true });
  })
  .post("/chat", enforceAuth, async (c) => {
    const user = c.var.user;
    await assertDailyChatLimit(user.id);

    const body = (await c.req.json().catch(() => ({}))) as {
      messages?: unknown;
    };
    const messages = Array.isArray(body.messages)
      ? body.messages
          .map(normalizeMessage)
          .filter((message): message is NormalizedChatMessage => !!message)
      : [];

    if (!messages.length) {
      throw new HTTPException(400, {
        message: "No chat messages were provided.",
      });
    }

    return stream(c, async (s) => {
      const result = streamText({
        model: getChatModel(),
        system: SYSTEM_PROMPT,
        messages,
        maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
      });

      for await (const chunk of result.textStream) {
        await s.write(chunk);
      }

      // Log usage after stream completes (best-effort)
      try {
        const usage = await result.usage;
        const inputTokens = usage?.inputTokens ?? 0;
        const outputTokens = usage?.outputTokens ?? 0;
        await db.insert(aiUsageLog).values({
          userId: user.id,
          feature: "chat",
          model: getChatModelName(),
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        });
      } catch {
        // ignore logging failures
      }
    });
  });
