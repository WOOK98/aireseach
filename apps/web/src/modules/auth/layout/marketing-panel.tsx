"use client";

import dynamic from "next/dynamic";

import { useTranslation } from "@workspace/i18n";

const DashboardPreview = dynamic(
  () => import("./dashboard-preview").then((mod) => mod.DashboardPreview),
  {
    ssr: false,
    loading: () => <div className="h-96 animate-pulse rounded-xl bg-white/5" />,
  },
);

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
      <DashboardPreview />
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

const DataIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20 20H4V4" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M4 16L8 12L12 14L20 6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AIIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      d="M12 2L2 7L12 12L22 7L12 2Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M2 17L12 22L22 17" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 12L12 17L22 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SecurityIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      d="M12 22S20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 12L11 14L15 10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
