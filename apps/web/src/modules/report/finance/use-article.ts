"use client";

/**
 * Article Generator Hook (#116)
 *
 * Calls POST /api/article/generate and returns structured ResearchArticle.
 */
import { useState, useRef } from "react";

import type { ResearchArticle } from "@workspace/shared/types/article";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type ArticleStatus = "idle" | "loading" | "done" | "error";

export interface ArticleState {
  status: ArticleStatus;
  article: ResearchArticle | null;
  rawJson: string;
  error: string | null;
  generate: (query: string, language?: "zh" | "en") => Promise<void>;
  reset: () => void;
}

export function useArticle(): ArticleState {
  const [status, setStatus] = useState<ArticleStatus>("idle");
  const [article, setArticle] = useState<ResearchArticle | null>(null);
  const [rawJson, setRawJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function generate(query: string, language: "zh" | "en" = "zh") {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus("loading");
    setArticle(null);
    setRawJson("");
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/article/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, language }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        let message = detail || `API error ${res.status}`;
        try {
          const json = JSON.parse(detail) as {
            message?: string;
            detail?: string;
          };
          message = json.message ?? json.detail ?? message;
        } catch {}
        throw new Error(message);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }

      setRawJson(accumulated);

      const parsed = JSON.parse(accumulated) as ResearchArticle & {
        _degraded?: boolean;
        _reason?: string;
      };

      if (parsed._degraded) {
        setError(
          parsed._reason ?? "Article generation degraded. Please retry.",
        );
        setArticle(parsed as ResearchArticle);
        setStatus("error");
        return;
      }

      setArticle(parsed);
      setStatus("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  function reset() {
    abortRef.current?.abort();
    setStatus("idle");
    setArticle(null);
    setRawJson("");
    setError(null);
  }

  return { status, article, rawJson, error, generate, reset };
}
