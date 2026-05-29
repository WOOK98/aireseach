/* oxlint-disable i18next/no-literal-string */

import { Microscope } from "lucide-react";

import { SerenityTerminal } from "~/modules/report/serenity-terminal";

export const metadata = {
  title: "Serenity Supply-Chain Analysis",
  description:
    "Analyze stocks through Serenity's (@aleabitoreddit) AI/semiconductor supply-chain bottleneck lens",
};

export default function SerenityPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center gap-3">
        <Microscope className="text-primary size-8" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            AI Research Terminal
          </h2>
          <p className="text-muted-foreground text-sm">
            Multi-skill analysis engine powered by{" "}
            <a
              href="https://x.com/aleabitoreddit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              @aleabitoreddit
            </a>
            {" "}framework
          </p>
        </div>
      </div>
      <SerenityTerminal />
    </div>
  );
}
