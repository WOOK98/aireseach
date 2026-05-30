import Link from "next/link";
import { StarField } from "~/modules/marketing/home/star-field";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050510]">
      <StarField />

      {/* Green glow top */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: 900,
          height: 450,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-28 text-center">
        {/* Badge row */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
          {[
            "Serenity Framework",
            "5,582 tweets distilled",
            "Supply-chain intelligence",
          ].map((label) => (
            <span
              key={label}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Headline */}
        <h1 className="mb-6 text-[clamp(2rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight">
          <span className="text-white/25">Analysts take days.</span>
          <br />
          <span className="text-white">We take seconds.</span>
        </h1>

        <p className="mx-auto mb-12 max-w-xl text-base leading-relaxed text-white/40">
          Turn any company, market, or industry into a structured analysis —
          with live sources, supply-chain mapping, and exportable reports.
        </p>

        {/* Search box */}
        <div className="mx-auto mb-5 max-w-xl rounded-xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm">
          <form
            action="/dashboard/report"
            className="flex items-center gap-2"
          >
            <div className="flex items-center gap-2.5 pl-4 text-white/30">
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span id="typed" className="text-sm" />
              <span className="animate-blink ml-0.5 h-[18px] w-[2px] bg-white/30" />
            </div>
            <button
              type="submit"
              className="ml-auto shrink-0 rounded-lg bg-green-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-green-400"
            >
              Start Research
            </button>
          </form>
        </div>

        <div className="mb-14 text-xs text-white/20">
          try: NVDA supply chain · AXTI InP bottleneck · NBIS neocloud quality
        </div>

        {/* Metrics */}
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-6 rounded-xl border border-white/5 bg-white/[.02] p-6">
          {[
            ["5,582", "Tweets analyzed"],
            ["~61%", "30-day accuracy"],
            ["~80%", "Mature thesis rate"],
          ].map(([value, label]) => (
            <div key={label}>
              <div className="mb-1 text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-white/30">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom glow */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: 900,
          height: 450,
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(34,197,94,.08) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
