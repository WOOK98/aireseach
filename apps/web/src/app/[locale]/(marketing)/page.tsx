import Link from "next/link";

import { ParticleField } from "~/modules/marketing/home/particle-field";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3f4f6]">
      <ParticleField />

      {/* Hero */}
      <section className="relative z-10 px-8 pt-24 pb-16 md:px-16 lg:px-24">
        <p className="mb-4 text-sm font-medium tracking-widest text-gray-400 uppercase">
          Supply-chain intelligence powered by Serenity Framework
        </p>
        <h1 className="max-w-3xl text-[clamp(2.2rem,5.5vw,4.5rem)] font-extrabold leading-[1.08] tracking-tight text-gray-900">
          研究效率，如虎添翼。
          <br />
          <span className="text-gray-400">Analysts take days. We take seconds.</span>
        </h1>
      </section>

      {/* Action cards */}
      <section className="relative z-10 px-8 pb-20 md:px-16 lg:px-24">
        <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "生成研究报告",
              desc: "输入目标，一键生成结构化分析",
              href: "/dashboard/report",
              icon: "📄",
            },
            {
              title: "供应链瓶颈分析",
              desc: "Serenity 14点清单 · 多跳 BOM 映射",
              href: "/dashboard/report",
              icon: "🔗",
            },
            {
              title: "AI 对话助手",
              desc: "DeepSeek 驱动，即时回答研究问题",
              href: "/dashboard/ai",
              icon: "💬",
            },
            {
              title: "定价方案",
              desc: "免费开始，Pro 解锁更多次数",
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
                开始 →
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
            免费开始你的第一份研究报告
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-gray-400">
            无需注册即可体验基础报告。创建账号保存历史、解锁更多分析次数。
          </p>
          <Link
            href="/dashboard/report"
            className="inline-block rounded-lg bg-green-500 px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-green-400"
          >
            开始研究 →
          </Link>
        </div>
      </section>
    </div>
  );
}
