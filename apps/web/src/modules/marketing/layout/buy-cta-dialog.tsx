"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { buttonVariants } from "@workspace/ui-web/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui-web/dialog";
import { Icons } from "@workspace/ui-web/icons";

const MIN_DELAY_MS = 15_000;
const MAX_DELAY_MS = 7_200_000;
const STORAGE_LAST_SHOWN_AT = "buyCtaDialog:lastShownAt";
const STORAGE_PREV_DELAY_MS = "buyCtaDialog:prevDelayMs";

export const BuyCtaDialog = () => {
  const { t } = useTranslation(["common", "marketing"]);

  const [open, setOpen] = useState(false);
  const timeoutIdRef = useRef<number | null>(null);

  useEffect(() => {
    const scheduleNext = () => {
      const now = Date.now();
      const storedLastShown = Number(
        window.localStorage.getItem(STORAGE_LAST_SHOWN_AT) ?? "0",
      );
      const prevDelayMs = Number(
        window.localStorage.getItem(STORAGE_PREV_DELAY_MS) ?? "0",
      );

      const nextDelay = Math.min(
        MAX_DELAY_MS,
        Math.max(
          MIN_DELAY_MS,
          prevDelayMs && Number.isFinite(prevDelayMs)
            ? prevDelayMs * 2
            : MIN_DELAY_MS,
        ),
      );

      const baseNextShow = storedLastShown
        ? storedLastShown + nextDelay
        : now + nextDelay;

      const delayFromNow = Math.max(MIN_DELAY_MS, baseNextShow - now);

      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }

      timeoutIdRef.current = window.setTimeout(() => {
        setOpen(true);

        const shownAt = Date.now();
        window.localStorage.setItem(STORAGE_LAST_SHOWN_AT, String(shownAt));
        window.localStorage.setItem(STORAGE_PREV_DELAY_MS, String(nextDelay));

        scheduleNext();
      }, delayFromNow);
    };

    scheduleNext();

    return () => {
      if (timeoutIdRef.current) {
        window.clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle>{t("cta.buy.question")}</DialogTitle>
          <DialogDescription className="text-foreground text-base">
            {t("cta.buy.description")}
          </DialogDescription>
        </DialogHeader>

        <a
          href="https://turbostarter.dev/#pricing"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants(), "gap-2")}
        >
          <Icons.Code className="size-4" />
          {t("cta.buy.button")}
        </a>

        <div className="bg-border relative -mx-6 my-3 h-px">
          <span className="bg-background text-muted-foreground absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 text-sm">
            {t("or")}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <p>{t("cta.buy.join.description")}</p>

          <a
            className={cn(
              buttonVariants(),
              "gap-2 bg-[#5865F2] px-7 no-underline hover:bg-[#5865F2]/95",
            )}
            href="https://discord.gg/KjpK2uk3JP"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icons.Discord className="size-[1.35rem] text-white" />
            <span className="font-semibold text-white">
              {t("cta.buy.join.button")}
            </span>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};
