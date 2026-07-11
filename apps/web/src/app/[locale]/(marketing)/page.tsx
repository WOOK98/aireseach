/* oxlint-disable i18next/no-literal-string */

import { getMetadata } from "~/lib/metadata";
import { EntitySearch } from "~/modules/company/entity-search";
import { WatchlistBadges } from "~/modules/company/watchlist-badges";

export const revalidate = 300;

export const generateMetadata = getMetadata({
  title: "Airesearch Company Pages",
  description:
    "Enter a company and open one verified research page with entity lock, current metrics, lens summaries, and monitorable thesis checks.",
});

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-[calc(100vh-140px)]">
      <section className="mx-auto flex min-h-[72vh] w-full max-w-5xl flex-col justify-center px-4 py-16">
        <div className="mb-8">
          <p className="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
            Airesearch
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            One company.
            <br />
            One page to understand it.
          </h1>
        </div>

        <EntitySearch />

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <WatchlistBadges />
        </div>

        <div className="bg-muted/20 mt-10 rounded-2xl border p-4">
          <p className="text-muted-foreground text-sm">Claude Code plugin</p>
          <code className="mt-2 block overflow-x-auto font-mono text-sm">
            /deep-dive {"{SYMBOL}"}
          </code>
        </div>
      </section>
    </div>
  );
}
