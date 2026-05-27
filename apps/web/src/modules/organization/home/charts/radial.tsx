"use client";

import { PolarGrid, RadialBar, RadialBarChart } from "recharts";

import { useTranslation } from "@workspace/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui-web/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui-web/chart";

import type { ChartConfig } from "@workspace/ui-web/chart";

const chartData = [
  { plan: "starter", subscriptions: 275, fill: "var(--chart-1)" },
  { plan: "growth", subscriptions: 200, fill: "var(--chart-2)" },
  { plan: "pro", subscriptions: 187, fill: "var(--chart-3)" },
  { plan: "scale", subscriptions: 173, fill: "var(--chart-4)" },
  { plan: "enterprise", subscriptions: 90, fill: "var(--chart-5)" },
];

export function RadialChart() {
  const { t } = useTranslation(["common", "dashboard"]);
  const chartConfig = {
    starter: {
      label: t("organization.home.planDistribution.plans.starter"),
      color: "var(--chart-1)",
    },
    growth: {
      label: t("organization.home.planDistribution.plans.growth"),
      color: "var(--chart-2)",
    },
    pro: {
      label: t("organization.home.planDistribution.plans.pro"),
      color: "var(--chart-3)",
    },
    scale: {
      label: t("organization.home.planDistribution.plans.scale"),
      color: "var(--chart-4)",
    },
    enterprise: {
      label: t("organization.home.planDistribution.plans.enterprise"),
      color: "var(--chart-5)",
    },
  } satisfies ChartConfig;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center space-y-0.5 pb-0">
        <CardTitle className="text-xl leading-tight">
          {t("organization.home.planDistribution.title")}
        </CardTitle>
        <CardDescription>
          {t("organization.home.planDistribution.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 py-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[300px]"
        >
          <RadialBarChart data={chartData} innerRadius={40} outerRadius={140}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="plan" />}
            />
            <PolarGrid gridType="circle" />
            <RadialBar dataKey="subscriptions" />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
