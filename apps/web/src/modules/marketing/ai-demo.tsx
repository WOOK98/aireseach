"use client";

import { useState } from "react";
import { Streamdown } from "streamdown";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Button } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";
import { ScrollArea } from "@workspace/ui-web/scroll-area";
import { Textarea } from "@workspace/ui-web/textarea";

import type { KeyboardEvent } from "react";

const EXAMPLES = [
  {
    icon: Icons.Globe2,
    prompt: "ai.prompt.history",
  },
  {
    icon: Icons.GraduationCap,
    prompt: "ai.prompt.capitals",
  },
  {
    icon: Icons.Atom,
    prompt: "ai.prompt.quantum",
  },
  {
    icon: Icons.Brain,
    prompt: "ai.prompt.realWorld",
  },
] as const;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "error";
};

const createMessageId = () =>
  globalThis.crypto?.randomUUID?.() ?? `message-${Date.now()}`;

const getFriendlyAiError = (rawMessage: string) => {
  let message = rawMessage;

  try {
    const parsed = JSON.parse(rawMessage) as {
      message?: string;
      error?: string;
      detail?: string;
    };
    message = parsed.message ?? parsed.error ?? parsed.detail ?? rawMessage;
  } catch {
    // Keep the original plain text response.
  }

  if (
    /api key|deepseek|invalid character|bytestring|not configured/i.test(
      message,
    )
  ) {
    return "AI service is temporarily unavailable because the model provider is not configured correctly. Please try again later.";
  }

  return message || "AI chat failed to respond. Please try again later.";
};

export const AIDemo = () => {
  const { t } = useTranslation("marketing");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = input.trim().length > 0 && !isLoading;

  const submitMessage = async (value = input) => {
    const text = value.trim();

    if (!text) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      text,
    };
    const assistantMessage: ChatMessage = {
      id: createMessageId(),
      role: "assistant",
      text: "",
    };

    const nextMessages = [...messages, userMessage];

    setMessages([...nextMessages, assistantMessage]);
    setError(null);
    setIsLoading(true);

    if (value === input) {
      setInput("");
    }

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        const fallback = `AI request failed with status ${response.status}.`;
        const detail = await response.text().catch(() => "");
        throw new Error(detail || fallback);
      }

      if (!response.body) {
        throw new Error("AI response did not include a readable stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value: chunk } = await reader.read();

        if (done) {
          break;
        }

        assistantText += decoder.decode(chunk, { stream: true });
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, text: assistantText }
              : message,
          ),
        );
      }

      assistantText += decoder.decode();
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, text: assistantText }
            : message,
        ),
      );
    } catch (err) {
      const friendlyError = getFriendlyAiError(
        err instanceof Error ? err.message : "AI chat failed.",
      );
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, status: "error", text: friendlyError }
            : message,
        ),
      );
      setError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl grow flex-col items-center justify-between gap-4 self-stretch">
      <ScrollArea className="w-full grow">
        <div className="flex flex-col gap-4 lg:gap-6">
          {messages.map((message) => (
            <article
              key={message.id}
              className={cn(
                "max-w-full",
                message.role === "user" &&
                  "bg-muted max-w-4/5 self-end rounded-lg px-5 py-2.5",
                message.role === "assistant" &&
                  "border-border bg-background/80 rounded-xl border px-5 py-4 shadow-sm",
                message.status === "error" &&
                  "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
              )}
            >
              {message.role === "assistant" ? (
                message.text ? (
                  <Streamdown>{message.text}</Streamdown>
                ) : (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Icons.Loader className="size-4 animate-spin" />
                    Thinking through your question...
                  </div>
                )
              ) : (
                <div>{message.text}</div>
              )}
            </article>
          ))}
          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
              {error || "AI chat failed to respond. Please try again later."}
            </div>
          )}
        </div>
      </ScrollArea>

      {!messages.length && !isLoading && (
        <div className="w-full space-y-4 pb-2">
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("ai.empty.title")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("ai.empty.description")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {EXAMPLES.map((example) => (
              <Button
                onClick={() => submitMessage(t(example.prompt))}
                key={example.prompt}
                variant="outline"
                className="text-muted-foreground hover:text-foreground h-auto grow flex-col items-start gap-2 py-3 text-left whitespace-normal"
              >
                <example.icon className="size-5 shrink-0" />
                {t(example.prompt)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submitMessage();
        }}
        className="bg-background sticky bottom-4 w-full md:bottom-6"
      >
        <Textarea
          placeholder={t("ai.placeholder")}
          className="min-h-24 resize-none text-base"
          rows={3}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          value={input}
          autoFocus
          onChange={(e) => setInput(e.currentTarget.value)}
        />

        <Button
          className="absolute right-2 bottom-3 size-8 rounded-full"
          size="icon"
          type="submit"
          disabled={!canSubmit}
          aria-label={t("ai.cta")}
        >
          <Icons.ArrowUp className="size-5" />
        </Button>
      </form>
    </div>
  );
};
