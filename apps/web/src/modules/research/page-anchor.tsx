/* oxlint-disable i18next/no-literal-string */

import { ExternalLink } from "lucide-react";
import { memo } from "react";

import { hasPageRef, withPageHash } from "./research-utils";

export const PageAnchor = memo(function PageAnchor({
  filingUrl,
  dataPoint,
}: {
  filingUrl: string;
  dataPoint?: string;
}) {
  if (!hasPageRef(dataPoint)) return null;

  return (
    <a
      href={withPageHash(filingUrl, dataPoint)}
      target="_blank"
      rel="noreferrer"
      className="notranslate inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] text-blue-800 hover:bg-blue-100"
      translate="no"
    >
      {dataPoint?.match(/\bp\.\s*\d+/i)?.[0] ?? "p.NN"}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
});
