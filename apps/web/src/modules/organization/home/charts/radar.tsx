"use client";

import dayjs from "dayjs";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as RechartsRadarChart,
} from "recharts";

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

const webValues = [412, 458, 396, 520, 610, 680];
const mobileValues = [188, 214, 196, 242, 310, 352];

const chartData = Array.from({ length: webValues.length }, (_, index) => {
  const date = dayjs().subtract(webValues.length - 1 - index, "month");

  return {
    month: date.format("MMMM"),
    web: webValues[index] ?? 0,
    mobile: mobileValues[index] ?? 0,
  };
});

export function RadarChart() {
  const { t } = useTranslation(["common", "dashboard"]);

  const chartConfig = {
    web: {
      label: t("web"),
      color: "var(--chart-1)",
    },
    mobile: {
      label: t("mobile"),
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="items-center space-y-0.5 pb-4">
        <CardTitle className="text-xl leading-tight">
          {t("organization.home.engagement.title")}
        </CardTitle>
        <CardDescription>
          {t("organization.home.engagement.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex grow items-center justify-center">
        <ChartContainer config={chartConfig} className="h-full max-h-[300px]">
          <RechartsRadarChart data={chartData}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar
              dataKey="web"
              fill={chartConfig.web.color}
              fillOpacity={0.6}
            />
            <Radar dataKey="mobile" fill={chartConfig.mobile.color} />
          </RechartsRadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
