/* oxlint-disable i18next/no-literal-string */

import { getMetadata } from "~/lib/metadata";
import { InstallSection } from "~/modules/install/install-section";

export const revalidate = 300;

export const generateMetadata = getMetadata({
  title: "Install AIResearch",
  description:
    "Install the AIResearch research plugin for Claude Code, with Codex-compatible personal marketplace setup notes.",
});

export default function InstallPage() {
  return (
    <div className="bg-background text-foreground min-h-[calc(100vh-140px)]">
      <section className="mx-auto w-full max-w-5xl px-4 py-12 md:py-16">
        <div className="mb-8 max-w-3xl">
          <p className="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
            Install
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Run AIResearch where you already work.
          </h1>
          <p className="text-muted-foreground mt-4 text-base leading-7 md:text-lg">
            Claude Code is the primary path. Codex can use the same repository
            through a personal marketplace setup.
          </p>
        </div>

        <InstallSection variant="page" />
      </section>
    </div>
  );
}
