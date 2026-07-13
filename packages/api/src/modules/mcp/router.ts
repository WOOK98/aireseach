import { Hono } from "hono";

import { logger } from "@workspace/shared/logger";

import { env } from "../../env";
import {
  cachedFetchEtfHoldings,
  cachedFetchTechnicalMetrics,
  cachedFetchYahooFinance,
  cachedResolveEntity,
} from "../report/data-sources";
import {
  buildIndustryUniverse,
  formatIndustryContext,
} from "../report/industry";
import { formatTechnicalContext } from "../report/technicals";

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
}

interface ToolCallParams {
  name?: string;
  arguments?: Record<string, unknown>;
}

const tools = [
  {
    name: "resolve_entity",
    description:
      "Resolve user input to exactly one listed ticker, or return candidates/industry-mode guidance.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Ticker, company name, industry, material, or theme.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_quote",
    description:
      "Return a lightweight verified quote/entity lock for a listed ticker.",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Listed ticker symbol." },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_financials",
    description:
      "Return Yahoo Finance financial metrics for a verified listed ticker.",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Listed ticker symbol." },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_technicals",
    description:
      "Return deterministic technical indicators calculated from Yahoo daily bars.",
    inputSchema: {
      type: "object",
      properties: {
        ticker: { type: "string", description: "Listed ticker symbol." },
        includeContext: {
          type: "boolean",
          description:
            "Include a prompt-ready TECHNICAL DATA LOCK string for analysis agents.",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_etf_holdings",
    description:
      'Return ETF constituent holdings. Dual mode: pass a theme phrase ("humanoid robot") to resolve ETF candidates and return a merged universe; pass a single ETF ticker ("HUMN") for raw holdings.',
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'Theme phrase ("humanoid robot") or ETF ticker ("HUMN").',
        },
        includeContext: {
          type: "boolean",
          description:
            "Include a prompt-ready INDUSTRY CONTEXT block for analysis agents.",
        },
      },
      required: ["query"],
    },
  },
];

const jsonRpc = (id: JsonRpcId | undefined, result: unknown) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result,
});

const jsonRpcError = (
  id: JsonRpcId | undefined,
  code: number,
  message: string,
  data?: unknown,
) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: {
    code,
    message,
    ...(data === undefined ? {} : { data }),
  },
});

const getToken = (authorization: string | undefined) => {
  if (!authorization) return "";
  const [scheme, value] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() === "bearer") return value ?? "";
  return authorization;
};

const normalizeKey = (raw: string) => {
  const eq = raw.indexOf("=");
  return eq > 0 ? raw.slice(eq + 1) : raw;
};

const extractKeyName = (raw: string) => {
  const eq = raw.indexOf("=");
  return eq > 0 ? raw.slice(0, eq) : "unknown";
};

const isAuthorized = (
  authorization: string | undefined,
): { authorized: boolean; keyName?: string } => {
  const entries = (env.MCP_API_KEYS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  if (entries.length === 0) return { authorized: false };

  const token = getToken(authorization);
  for (const entry of entries) {
    if (normalizeKey(entry) === token) {
      return { authorized: true, keyName: extractKeyName(entry) };
    }
  }
  return { authorized: false };
};

// In-memory sliding window rate limit.
// NOTE: On Vercel serverless each function instance has its own memory,
// so this is a best-effort guard, not a distributed rate limit.
// For real abuse protection, swap in @upstash/ratelimit + Redis.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const rateLimitBuckets = new Map<string, { timestamps: number[] }>();

const checkRateLimit = (keyName: string): boolean => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(keyName);
  if (!bucket) {
    rateLimitBuckets.set(keyName, { timestamps: [now] });
    return true;
  }
  // Prune expired entries
  bucket.timestamps = bucket.timestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (bucket.timestamps.length >= RATE_LIMIT_MAX) return false;
  bucket.timestamps.push(now);
  return true;
};

const MAX_BATCH_SIZE = 10;

const getStringArgument = (
  args: Record<string, unknown>,
  key: string,
): string | null => {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const textContent = (payload: unknown) => ({
  content: [
    {
      type: "text",
      text:
        typeof payload === "string"
          ? payload
          : JSON.stringify(payload, null, 2),
    },
  ],
});

const callTool = async (params: ToolCallParams) => {
  const args = params.arguments ?? {};

  switch (params.name) {
    case "resolve_entity": {
      const query = getStringArgument(args, "query");
      if (!query) throw new Error("resolve_entity requires query.");

      return textContent(await cachedResolveEntity(query));
    }

    case "get_quote": {
      const ticker = getStringArgument(args, "ticker");
      if (!ticker) throw new Error("get_quote requires ticker.");

      const entity = await cachedResolveEntity(ticker);
      if (!entity.ok) return textContent(entity);

      return textContent({
        ok: true,
        ticker: entity.ticker,
        companyName: entity.companyName,
        exchange: entity.exchange,
        price: entity.price,
        currency: entity.currency,
        entityLock: entity.entityLock,
      });
    }

    case "get_financials": {
      const ticker = getStringArgument(args, "ticker");
      if (!ticker) throw new Error("get_financials requires ticker.");

      const entity = await cachedResolveEntity(ticker);
      if (!entity.ok) return textContent(entity);

      return textContent({
        ok: true,
        entity,
        data: await cachedFetchYahooFinance(entity.ticker),
      });
    }

    case "get_technicals": {
      const ticker = getStringArgument(args, "ticker");
      if (!ticker) throw new Error("get_technicals requires ticker.");

      const entity = await cachedResolveEntity(ticker);
      if (!entity.ok) return textContent(entity);

      const data = await cachedFetchTechnicalMetrics(entity.ticker);
      return textContent({
        ok: true,
        entity,
        data,
        ...(args.includeContext === true
          ? { technicalContext: formatTechnicalContext(data) }
          : {}),
      });
    }

    case "get_etf_holdings": {
      const query = getStringArgument(args, "query");
      if (!query) throw new Error("get_etf_holdings requires query.");

      const entity = await cachedResolveEntity(query);

      // Single ETF ticker — return raw holdings
      if (entity.ok && entity.quoteType === "ETF") {
        const holdings = await cachedFetchEtfHoldings(entity.ticker);
        return textContent({
          ok: true,
          mode: "single-etf",
          etf: {
            ticker: entity.ticker,
            companyName: entity.companyName,
          },
          holdings,
        });
      }

      // Already resolved to a non-ETF (equity) — hint the caller
      if (entity.ok && entity.quoteType !== "ETF") {
        return textContent({
          ok: false,
          hint: "equity_ticker",
          message: `"${query}" resolved to ${entity.ticker} (${entity.companyName}), which is an equity, not an ETF. Use get_financials or get_technicals for equity analysis.`,
        });
      }

      // Theme / industry query — resolve candidates, build universe
      const candidates = "candidates" in entity ? entity.candidates : [];
      const universe = await buildIndustryUniverse(
        query,
        candidates,
        cachedFetchEtfHoldings,
      );

      if (!universe) {
        return textContent({
          ok: false,
          mode: "no-etf-data",
          message: `No theme-ETF holdings found for "${query}". Candidates returned ${candidates.length} result(s), but none were ETFs with accessible holdings.`,
          candidates: candidates.map((c) => ({
            ticker: c.ticker,
            name: c.companyName,
            type: c.quoteType,
          })),
        });
      }

      return textContent({
        ok: true,
        mode: "industry",
        universe,
        ...(args.includeContext === true
          ? { industryContext: formatIndustryContext(universe) }
          : {}),
      });
    }

    default:
      throw new Error(`Unknown tool: ${params.name ?? "missing name"}`);
  }
};

const handleRequest = async (request: JsonRpcRequest) => {
  switch (request.method) {
    case "initialize":
      return jsonRpc(request.id, {
        protocolVersion: "2025-06-18",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "airesearch-market-data",
          version: "0.3.0",
        },
      });

    case "notifications/initialized":
      return null;

    case "tools/list":
      return jsonRpc(request.id, { tools });

    case "tools/call":
      return jsonRpc(
        request.id,
        await callTool((request.params ?? {}) as ToolCallParams),
      );

    default:
      return jsonRpcError(
        request.id,
        -32601,
        `Unsupported MCP method: ${request.method ?? "missing method"}`,
      );
  }
};

export const mcpRouter = new Hono()
  .get("/", (c) =>
    c.json({
      ok: true,
      name: "airesearch-market-data",
      transport: "streamable-http-json-rpc",
      tools: tools.map((tool) => tool.name),
    }),
  )
  .post("/", async (c) => {
    const clientIp =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown";

    const auth = isAuthorized(c.req.header("authorization"));
    if (!auth.authorized) {
      logger.warn("MCP auth failed", { ip: clientIp });
      return c.json(
        jsonRpcError(null, -32001, "Unauthorized MCP request."),
        401,
      );
    }

    if (!checkRateLimit(auth.keyName!)) {
      logger.warn("MCP rate limited", { keyName: auth.keyName, ip: clientIp });
      return c.json(jsonRpcError(null, -32003, "Rate limit exceeded."), 429);
    }

    const body = (await c.req.json().catch(() => null)) as
      | JsonRpcRequest
      | JsonRpcRequest[]
      | null;

    if (!body) {
      return c.json(jsonRpcError(null, -32700, "Invalid JSON-RPC body."), 400);
    }

    if (Array.isArray(body)) {
      if (body.length > MAX_BATCH_SIZE) {
        return c.json(
          jsonRpcError(
            null,
            -32600,
            `Batch size ${body.length} exceeds max ${MAX_BATCH_SIZE}.`,
          ),
          400,
        );
      }
      const results = (
        await Promise.all(body.map((request) => handleRequest(request)))
      ).filter((result) => result !== null);
      return c.json(results);
    }

    const result = await handleRequest(body);
    if (result === null) {
      return new Response(null, { status: 202 });
    }

    return c.json(result);
  });
