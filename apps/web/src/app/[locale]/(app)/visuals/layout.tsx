import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Data Atlas | airesearch",
  description:
    "Aggregate research data panels — verification flow, thesis quality, fundamentals, and evidence sources.",
  openGraph: {
    title: "Research Data Atlas",
    description:
      "Aggregate research data panels powered by real verification and financial data.",
    type: "website",
  },
};

export default function VisualsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
