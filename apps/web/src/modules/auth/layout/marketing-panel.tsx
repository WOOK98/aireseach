"use client";

import { useTranslation } from "@workspace/i18n";
import { Card } from "@workspace/ui-web/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const chartData = [
  { month: "Oct", value: 10 },
  { month: "Nov", value: 20 },
  { month: "Dec", value: 35 },
  { month: "Jan", value: 50 },
  { month: "Feb", value: 45 },
  { month: "Mar", value: 65 },
  { month: "Apr", value: 55 },
  { month: "May", value: 80 },
  { month: "Jun", value: 85 },
  { month: "Jul", value: 90 },
];

const topIndustries = [
  { name: "AI Infrastructure", growth: 110 },
  { name: "EV Supply Chain", growth: 96 },
  { name: "Cloud Security", growth: 91 },
  { name: "Medical Devices", growth: 87 },
  { name: "Semiconductor", growth: 82 },
];

export const AuthMarketingPanel = () => {
  const { t } = useTranslation("auth");

  return (
    <div className="flex h-full flex-col bg-[#0a1628] p-8 text-white">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("login.marketing.title")}
        </h2>
      </div>

      {/* Feature Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4">
        <FeatureCard
          icon={<DataIcon />}
          title={t("login.marketing.features.data.title")}
          description={t("login.marketing.features.data.description")}
        />
        <FeatureCard
          icon={<AIIcon />}
          title={t("login.marketing.features.ai.title")}
          description={t("login.marketing.features.ai.description")}
        />
        <FeatureCard
          icon={<SecurityIcon />}
          title={t("login.marketing.features.security.title")}
          description={t("login.marketing.features.security.description")}
        />
      </div>

      {/* Dashboard Preview */}
      <div className="flex-1 rounded-xl border border-white/10 bg-[#0f1f3a] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/70">
            {t("login.marketing.dashboard.marketGrowth")}
          </h3>
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
            {t("login.marketing.dashboard.live")}
          </span>
        </div>

        {/* Chart */}
        <div className="mb-6 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} />
              <Tooltip
                contentStyle={{
                  background: "#1f2937",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#gradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Industries */}
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-medium text-white/50">
            {t("login.marketing.dashboard.topIndustries")}
          </h4>
          <div className="space-y-2">
            {topIndustries.map((industry) => (
              <div
                key={industry.name}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-white/70">{industry.name}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${industry.growth}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-green-400">
                    {industry.growth}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
          <StatItem label={t("login.marketing.stats.reports")} value="12,000+" />
          <StatItem label={t("login.marketing.stats.users")} value="5,000+" />
          <StatItem label={t("login.marketing.stats.sources")} value="500M+" />
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-white/50">{description}</p>
    </div>
  </div>
);

const StatItem = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <div className="text-lg font-bold text-green-400">{value}</div>
    <div className="text-[10px] text-white/50">{label}</div>
  </div>
);

const DataIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 20H4V4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 16L8 12L12 14L20 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AIIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 17L12 22L22 17" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 12L12 17L22 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SecurityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22S20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12L11 14L15 10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
