/* oxlint-disable i18next/no-literal-string */

import Link from "next/link";

import { InstallCopyButton } from "./install-copy-button";

const CLAUDE_COMMANDS = [
  "/plugin marketplace add WOOK98/airesearch-plugin",
  "/plugin install airesearch@airesearch-marketplace",
] as const;

export const CLAUDE_INSTALL_COMMAND = CLAUDE_COMMANDS.join("\n");

const SKILLS = [
  {
    name: "deep-dive",
    description: "six-lens company research with falsifiable judgments",
  },
  {
    name: "snapshot",
    description: "a fast one-screen read on a company or ticker",
  },
  {
    name: "morning-brief",
    description: "a two-minute watchlist brief before the market day",
  },
  {
    name: "filing",
    description: "SEC filing lookup and page-anchored evidence extraction",
  },
] as const;

export function InstallSection({
  variant = "compact",
}: {
  variant?: "compact" | "page";
}) {
  const isPage = variant === "page";

  return (
    <section
      className={`border-border bg-background rounded-2xl border ${
        isPage ? "p-5 md:p-8" : "p-4 md:p-5"
      }`}
      aria-labelledby="install-airesearch"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-muted-foreground mb-2 font-mono text-xs tracking-[0.16em] uppercase">
              Claude Code first · Codex-compatible
            </p>
            <h2
              id="install-airesearch"
              className={
                isPage ? "text-3xl font-semibold" : "text-xl font-semibold"
              }
            >
              Install the AIResearch research plugin
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              Run the plugin from Claude Code for the primary workflow, or use
              the same repository through a personal Codex marketplace setup.
            </p>
          </div>
          <Link
            href="/install"
            className="hover:bg-muted inline-flex h-9 shrink-0 items-center justify-center rounded-md border px-3 text-sm font-medium transition"
          >
            Open install page
          </Link>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="bg-muted/20 min-w-0 rounded-xl border p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-mono text-xs tracking-[0.14em] uppercase">
                Claude Code
              </p>
              <InstallCopyButton value={CLAUDE_INSTALL_COMMAND} />
            </div>
            <pre
              className="notranslate bg-background max-w-full overflow-x-auto rounded-lg p-3 font-mono text-sm leading-7"
              translate="no"
            >
              <code className="notranslate" translate="no">
                {CLAUDE_INSTALL_COMMAND}
              </code>
            </pre>
          </div>

          <div className="min-w-0 rounded-xl border p-4">
            <p className="font-mono text-xs tracking-[0.14em] uppercase">
              Codex / ChatGPT
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              This repository includes a{" "}
              <code className="notranslate font-mono" translate="no">
                .codex-plugin
              </code>{" "}
              manifest for personal marketplace installation. Use it when you
              want the same research entry points in Codex.
            </p>
            <Link
              href="https://github.com/WOOK98/aireseach/blob/main/docs/codex-install.md"
              className="hover:bg-muted mt-4 inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition"
            >
              Read Codex setup
            </Link>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <div className="min-w-0 rounded-xl border p-4">
            <p className="font-mono text-xs tracking-[0.14em] uppercase">
              What you get
            </p>
            <ul className="mt-3 grid gap-2 text-sm">
              {SKILLS.map((skill) => (
                <li key={skill.name} className="flex gap-2">
                  <span
                    className="notranslate mt-0.5 font-mono text-xs"
                    translate="no"
                  >
                    /{skill.name}
                  </span>
                  <span className="text-muted-foreground">
                    {skill.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 rounded-xl border p-4">
            <p className="font-mono text-xs tracking-[0.14em] uppercase">
              Data access
            </p>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              No API key is required for the basic research flow; it can use web
              search. Beta access to the hosted data layer for real-time quotes,
              ETF holdings, and SEC filing search is issued manually.
            </p>
            <a
              href="mailto:hello@airesearchs.com"
              className="notranslate hover:bg-muted mt-4 inline-flex h-9 items-center justify-center rounded-md border px-3 font-mono text-sm font-medium transition"
              translate="no"
            >
              hello@airesearchs.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
