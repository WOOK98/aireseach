import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";

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

type RawMessagePart = { type?: string; text?: string };
type RawChatMessage = {
  role?: string;
  text?: string;
  content?: string;
  parts?: RawMessagePart[];
};
type NormalizedChatMessage = { role: "user" | "assistant"; content: string };

function extractMessageText(message: RawChatMessage): string {
  if (typeof message.text === "string") return message.text;
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text as string)
      .join("");
  }
  return "";
}

function normalizeMessage(value: unknown): NormalizedChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const msg = value as RawChatMessage;
  if (msg.role !== "user" && msg.role !== "assistant") return null;
  const content = extractMessageText(msg).trim();
  if (!content) return null;
  return { role: msg.role, content };
}

function getChatModel() {
  const deepseekKey =
    process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";

  if (openaiKey) {
    return createOpenAI({ apiKey: openaiKey }).chat("gpt-4.1-nano");
  }

  return createOpenAI({
    apiKey: deepseekKey,
    baseURL: "https://api.deepseek.com/v1",
  }).chat("deepseek-chat");
}

const CHAT_MAX_OUTPUT_TOKENS = 2048;

export async function POST(request: Request) {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.LLM_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        message:
          "AI chat is not configured. Set OPENAI_API_KEY or DEEPSEEK_API_KEY.",
      },
      { status: 500 },
    );
  }

  // Verify session via internal call to the Node.js auth handler.
  // Better Auth's cookieCache (5-min TTL) makes this a fast in-memory path
  // for repeat requests — no DB round-trip.
  const origin = new URL(request.url).origin;
  let isAuthenticated = false;
  try {
    const sessionRes = await fetch(`${origin}/api/auth/get-session`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    const session = (await sessionRes.json()) as {
      user?: { id: string };
    } | null;
    isAuthenticated = !!session?.user;
  } catch {
    // If the auth check itself fails, deny access.
    isAuthenticated = false;
  }

  if (!isAuthenticated) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    messages?: unknown;
  };
  const messages = Array.isArray(body.messages)
    ? body.messages
        .map(normalizeMessage)
        .filter((m): m is NormalizedChatMessage => !!m)
    : [];

  if (!messages.length) {
    return Response.json(
      { message: "No chat messages were provided." },
      { status: 400 },
    );
  }

  const reserveRes = await fetch(`${origin}/api/ai/chat/reserve`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  if (!reserveRes.ok) {
    const fallbackMessage =
      reserveRes.status === 429
        ? "Daily chat limit reached (20/day). Try again tomorrow."
        : "Unable to reserve AI chat usage.";
    const error = (await reserveRes.json().catch(() => null)) as {
      message?: string;
    } | null;

    return Response.json(
      { message: error?.message ?? fallbackMessage },
      { status: reserveRes.status },
    );
  }

  return streamText({
    model: getChatModel(),
    system: SYSTEM_PROMPT,
    messages,
    maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS,
  }).toTextStreamResponse();
}
