/* oxlint-disable i18next/no-literal-string */
import Link from "next/link";

import { getMetadata } from "~/lib/metadata";
import { ParticleField } from "~/modules/marketing/home/particle-field";
import { FaqJsonLd } from "~/modules/marketing/layout/json-ld";

export const revalidate = 3600; // ISR: revalidate every hour

export const generateMetadata = getMetadata({
  title: "Airesearch — Supply-chain intelligence powered by AI",
  description:
    "Turn any company, market, or industry into a structured analysis — with live sources, your own model key, and exportable reports in minutes.",
});

const FAQ_ITEMS = [
  {
    question: "What is AI Research?",
    answer:
      "AI Research is a supply-chain intelligence platform powered by Serenity Framework. It generates structured research reports in seconds, analyzes supply chains with a 14-point checklist, and provides AI-powered chat assistance.",
  },
  {
    question: "How accurate are the research reports?",
    answer:
      "Our platform achieves approximately 61% accuracy over a 30-day window, with a mature thesis rate of approximately 80%. We analyze over 5,500 data points per report.",
  },
  {
    question: "Is AI Research free to use?",
    answer:
      "Yes, you can start generating basic research reports for free without signing up. Create an account to save your history and unlock additional analyses with the Pro plan.",
  },
  {
    question: "What kind of analysis does AI Research provide?",
    answer:
      "AI Research provides research reports, supply chain analysis with multi-hop BOM mapping, and an AI chat assistant powered by DeepSeek for instant answers to research questions.",
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3f4f6]">
      <FaqJsonLd items={FAQ_ITEMS} />
      <ParticleField />

      {/* Hero */}
      <section className="relative z-10 px-8 pt-24 pb-16 md:px-16 lg:px-24">
        <p className="mb-4 text-sm font-medium tracking-widest text-gray-400 uppercase">
          Supply-chain intelligence powered by Serenity Framework
        </p>
        <h1 className="max-w-3xl text-[clamp(2.2rem,5.5vw,4.5rem)] leading-[1.08] font-extrabold tracking-tight text-gray-900">
          Research at the speed of thought.
          <br />
          <span className="text-gray-400">
            Analysts take days. We take seconds.
          </span>
        </h1>
      </section>

      {/* Action cards */}
      <section className="relative z-10 px-8 pb-20 md:px-16 lg:px-24">
        <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Research Reports",
              desc: "Enter a target, generate structured analysis in one click",
              href: "/dashboard/report",
              icon: "📄",
            },
            {
              title: "Supply Chain Analysis",
              desc: "Serenity 14-point checklist · Multi-hop BOM mapping",
              href: "/dashboard/report",
              icon: "🔗",
            },
            {
              title: "AI Chat Assistant",
              desc: "DeepSeek powered, instant answers to research questions",
              href: "/dashboard/ai",
              icon: "💬",
            },
            {
              title: "Pricing",
              desc: "Start free, unlock more with Pro",
              href: "/pricing",
              icon: "💎",
            },
          ].map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-xl border border-gray-200 bg-white/80 p-5 backdrop-blur-sm transition-all hover:border-gray-300 hover:shadow-lg"
            >
              <div className="mb-3 text-2xl">{card.icon}</div>
              <div className="mb-1 font-semibold text-gray-900">
                {card.title}
              </div>
              <div className="text-sm leading-relaxed text-gray-500">
                {card.desc}
              </div>
              <span className="mt-3 inline-block text-sm font-medium text-green-600 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                Get started →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Metrics strip */}
      <section className="relative z-10 px-8 pb-20 md:px-16 lg:px-24">
        <div className="flex max-w-4xl flex-wrap gap-8 rounded-xl border border-gray-200 bg-white/60 px-8 py-6 backdrop-blur-sm">
          {[
            ["5,582", "Tweets analyzed"],
            ["~61%", "30-day accuracy"],
            ["~80%", "Mature thesis rate"],
            ["14", "Point checklist"],
          ].map(([value, label]) => (
            <div key={label} className="flex-1 text-center">
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="mt-1 text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA strip */}
      <section className="relative z-10">
        <div className="mx-4 mb-8 rounded-xl bg-gray-900 px-8 py-10 text-center md:mx-16 lg:mx-24">
          <h2 className="mb-3 text-2xl font-bold text-white">
            Start your first research report for free
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-gray-400">
            No sign-up required for basic reports. Create an account to save
            history and unlock more analyses.
          </p>
          <Link
            href="/dashboard/report"
            className="inline-block rounded-lg bg-green-500 px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-green-400"
          >
            Start researching →
          </Link>
        </div>
      </section>
    </div>
  );
}
