"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace Command Surface (#186)
 *
 * ⌘K / Ctrl+K palette over the `/workspace` object shell:
 * - create research note → real Research route
 * - search / open note → selects `?object=note:<id>`
 * - open PDF / PDF reader → selects `?object=pdf:<id>` or the reader route
 * - capture URL / paste → real POST /api/inbox, then selects the new item
 * - insert evidence / live block → gated on an active note, focuses the
 *   inspector insert rail
 *
 * All mutations go through existing API hooks — no new API surface.
 * Dynamic titles / tickers / authors use notranslate.
 */
import {
  FileText,
  Inbox,
  Loader2,
  NotebookPen,
  Search,
  Zap,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@workspace/ui-web/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui-web/command";
import { Input } from "@workspace/ui-web/input";
import { Textarea } from "@workspace/ui-web/textarea";

import { pathsConfig } from "~/config/paths";
import {
  useInboxMutations,
  type InboxSourceType,
} from "~/modules/inbox/use-inbox";
import { useNotes } from "~/modules/notes/use-notes";
import { usePdfs } from "~/modules/pdfs/use-pdfs";
import {
  buildWorkspaceCommands,
  formatObjectParam,
  parseObjectParam,
  type WorkspaceCommandId,
} from "~/modules/workspace/workspace-object";

/** Element id of the inspector insert rail — command focuses it. */
export const INSERT_RAIL_ELEMENT_ID = "workspace-insert-rail";

function selectObject(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  param: string | null,
) {
  router.replace(
    param ? `${pathname}?object=${encodeURIComponent(param)}` : pathname,
  );
}

// ── Capture-to-inbox inline form ────────────────────────────────────────────

function CaptureForm({
  onCaptured,
  onCancel,
}: {
  onCaptured: (id: string) => void;
  onCancel: () => void;
}) {
  const mutations = useInboxMutations();
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<InboxSourceType>("url");
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");

  const canSubmit =
    title.trim().length > 0 &&
    (sourceType === "paste"
      ? rawText.trim().length > 0
      : url.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      const item = await mutations.create.mutateAsync({
        sourceType,
        title: title.trim(),
        url: sourceType === "paste" ? null : url.trim(),
        rawText: sourceType === "paste" ? rawText.trim() : null,
      });
      toast.success("Captured to inbox");
      onCaptured(item.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Capture failed");
    }
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Capture to inbox</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          ← Back
        </button>
      </div>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title — what is this evidence?"
        autoFocus
      />

      <div className="flex gap-1.5">
        {(["url", "paste"] as const).map((type) => (
          <Button
            key={type}
            type="button"
            variant={sourceType === type ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSourceType(type)}
          >
            {type === "url" ? "URL" : "Paste text"}
          </Button>
        ))}
      </div>

      {sourceType === "paste" ? (
        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste the text snippet…"
          rows={4}
        />
      ) : (
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="notranslate font-mono"
          translate="no"
        />
      )}

      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={!canSubmit || mutations.create.isPending}
        onClick={handleSubmit}
      >
        {mutations.create.isPending && (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        )}
        Save to inbox
      </Button>
    </div>
  );
}

// ── Command surface ─────────────────────────────────────────────────────────

export function WorkspaceCommandSurface() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selection = parseObjectParam(searchParams.get("object"));

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"root" | "capture">("root");

  const notesQuery = useNotes({});
  const pdfsQuery = usePdfs({});
  const notes = useMemo(
    () => (notesQuery.data ?? []).slice(0, 8),
    [notesQuery.data],
  );
  const pdfs = useMemo(
    () => (pdfsQuery.data ?? []).slice(0, 8),
    [pdfsQuery.data],
  );

  const commands = buildWorkspaceCommands({
    noteActive: selection?.kind === "note",
    researchHref: pathsConfig.dashboard.user.research,
    pdfsHref: pathsConfig.dashboard.user.pdfs,
  });

  // ⌘K / Ctrl+K toggle.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMode("root");
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function close() {
    setOpen(false);
    setMode("root");
  }

  function runCommand(id: WorkspaceCommandId, href?: string) {
    if (href) {
      close();
      router.push(href);
      return;
    }
    if (id === "capture-inbox") {
      setMode("capture");
      return;
    }
    if (id === "insert-block") {
      close();
      document
        .getElementById(INSERT_RAIL_ELEMENT_ID)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    close();
  }

  return (
    <>
      {/* Trigger — reads as a search bar, like Notion's ⌘K */}
      <button
        type="button"
        onClick={() => {
          setMode("root");
          setOpen(true);
        }}
        className="border-border bg-muted/40 text-muted-foreground hover:bg-muted/70 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 text-left">
          Search objects or run a command…
        </span>
        <kbd className="bg-background hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        {mode === "capture" ? (
          <CaptureForm
            onCancel={() => setMode("root")}
            onCaptured={(id) => {
              close();
              selectObject(
                router,
                pathname,
                formatObjectParam({ kind: "inbox", id }),
              );
            }}
          />
        ) : (
          <>
            <CommandInput placeholder="Type a command or search objects…" />
            <CommandList>
              <CommandEmpty>No matching commands or objects.</CommandEmpty>

              <CommandGroup heading="Actions">
                {commands.map((cmd) => (
                  <CommandItem
                    key={cmd.id}
                    value={cmd.title}
                    disabled={!cmd.enabled}
                    onSelect={() => runCommand(cmd.id, cmd.href)}
                  >
                    {cmd.id === "create-note" && (
                      <NotebookPen className="size-4" />
                    )}
                    {cmd.id === "open-note" && <Search className="size-4" />}
                    {cmd.id === "open-pdf" && <FileText className="size-4" />}
                    {cmd.id === "capture-inbox" && <Inbox className="size-4" />}
                    {cmd.id === "insert-block" && <Zap className="size-4" />}
                    <span>{cmd.title}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {cmd.enabled ? cmd.hint : cmd.disabledReason}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              {notes.length > 0 && (
                <CommandGroup heading="Notes">
                  {notes.map((note) => (
                    <CommandItem
                      key={note.id}
                      value={`note ${note.title} ${note.entityTicker ?? ""}`}
                      onSelect={() => {
                        close();
                        selectObject(
                          router,
                          pathname,
                          formatObjectParam({ kind: "note", id: note.id }),
                        );
                      }}
                    >
                      <NotebookPen className="size-4" />
                      <span className="notranslate truncate" translate="no">
                        {note.title}
                      </span>
                      {note.entityTicker && (
                        <span
                          className="notranslate text-muted-foreground ml-auto font-mono text-xs"
                          translate="no"
                        >
                          {note.entityTicker}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {pdfs.length > 0 && (
                <CommandGroup heading="PDFs">
                  {pdfs.map((pdf) => (
                    <CommandItem
                      key={pdf.id}
                      value={`pdf ${pdf.fileName} ${pdf.ticker ?? ""}`}
                      onSelect={() => {
                        close();
                        selectObject(
                          router,
                          pathname,
                          formatObjectParam({ kind: "pdf", id: pdf.id }),
                        );
                      }}
                    >
                      <FileText className="size-4" />
                      <span className="notranslate truncate" translate="no">
                        {pdf.fileName}
                      </span>
                      {pdf.ticker && (
                        <span
                          className="notranslate text-muted-foreground ml-auto font-mono text-xs"
                          translate="no"
                        >
                          {pdf.ticker}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </>
        )}
      </CommandDialog>
    </>
  );
}
