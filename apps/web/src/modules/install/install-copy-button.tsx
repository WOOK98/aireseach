"use client";

/* oxlint-disable i18next/no-literal-string */

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { useCopyToClipboard } from "~/modules/common/hooks/use-copy-to-clipboard";

export function InstallCopyButton({ value }: { value: string }) {
  const [copiedText, copy] = useCopyToClipboard();
  const [visible, setVisible] = useState(false);
  const copied = visible && copiedText === value;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await copy(value);
        setVisible(ok);
      }}
      className="hover:bg-muted inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition"
      aria-label={copied ? "Copied install commands" : "Copy install commands"}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
