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
};

const createMessageId = () =>
  globalThis.crypto?.randomUUID?.() ?? `message-${Date.now()}`;

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
      setMessages(nextMessages);
      setError(err instanceof Error ? err.message : "AI chat failed.");
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
    <div className="mx-auto flex w-full max-w-2xl grow flex-col items-center justify-between gap-4 self-stretch">
      <ScrollArea className="w-full grow">
        <div className="flex flex-col gap-4 lg:gap-6">
          {messages.map((message) => (
            <article
              key={message.id}
              className={cn("max-w-full", {
                "bg-muted max-w-4/5 self-end rounded-lg px-5 py-2.5":
                  message.role === "user",
              })}
            >
              {message.role === "assistant" ? (
                <Streamdown>{message.text}</Streamdown>
              ) : (
                <div>{message.text}</div>
              )}
            </article>
          ))}
          {isLoading && (
            <Icons.Loader className="text-muted-foreground size-5 animate-spin" />
          )}
          {error && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
              {error || "AI chat failed to respond. Please try again later."}
            </div>
          )}
        </div>
      </ScrollArea>

      {!messages.length && !isLoading && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {EXAMPLES.map((example) => (
            <Button
              onClick={() => submitMessage(t(example.prompt))}
              key={example.prompt}
              variant="outline"
              className="text-muted-foreground h-auto grow flex-col items-start gap-2 py-3 text-left whitespace-normal"
            >
              <example.icon className="size-5 shrink-0" />
              {t(example.prompt)}
            </Button>
          ))}
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
