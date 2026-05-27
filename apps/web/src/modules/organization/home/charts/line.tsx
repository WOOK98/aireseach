"use client";

import dayjs from "dayjs";
import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
} from "recharts";

import { useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-web/badge";
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
import { Icons } from "@workspace/ui-web/icons";

import type { ChartConfig } from "@workspace/ui-web/chart";

const chartValues = [
  { web: 222, mobile: 150 },
  { web: 97, mobile: 180 },
  { web: 167, mobile: 120 },
  { web: 242, mobile: 260 },
  { web: 373, mobile: 290 },
  { web: 301, mobile: 340 },
  { web: 245, mobile: 180 },
  { web: 409, mobile: 320 },
  { web: 59, mobile: 110 },
  { web: 261, mobile: 190 },
  { web: 327, mobile: 350 },
  { web: 292, mobile: 210 },
  { web: 342, mobile: 380 },
  { web: 137, mobile: 220 },
  { web: 120, mobile: 170 },
  { web: 138, mobile: 190 },
  { web: 446, mobile: 360 },
  { web: 364, mobile: 410 },
  { web: 243, mobile: 180 },
  { web: 89, mobile: 150 },
  { web: 137, mobile: 200 },
  { web: 224, mobile: 170 },
  { web: 138, mobile: 230 },
  { web: 387, mobile: 290 },
  { web: 215, mobile: 250 },
  { web: 75, mobile: 130 },
  { web: 383, mobile: 420 },
  { web: 122, mobile: 180 },
  { web: 315, mobile: 240 },
  { web: 454, mobile: 380 },
  { web: 165, mobile: 220 },
  { web: 293, mobile: 310 },
  { web: 247, mobile: 190 },
  { web: 385, mobile: 420 },
  { web: 481, mobile: 390 },
  { web: 498, mobile: 520 },
  { web: 388, mobile: 300 },
  { web: 149, mobile: 210 },
  { web: 227, mobile: 180 },
  { web: 293, mobile: 330 },
  { web: 335, mobile: 270 },
  { web: 197, mobile: 240 },
  { web: 197, mobile: 160 },
  { web: 448, mobile: 490 },
  { web: 473, mobile: 380 },
  { web: 338, mobile: 400 },
  { web: 499, mobile: 420 },
  { web: 315, mobile: 350 },
  { web: 235, mobile: 180 },
  { web: 177, mobile: 230 },
  { web: 82, mobile: 140 },
  { web: 81, mobile: 120 },
  { web: 252, mobile: 290 },
  { web: 294, mobile: 220 },
  { web: 201, mobile: 250 },
  { web: 213, mobile: 170 },
  { web: 420, mobile: 460 },
  { web: 233, mobile: 190 },
  { web: 78, mobile: 130 },
  { web: 340, mobile: 280 },
  { web: 178, mobile: 230 },
  { web: 178, mobile: 200 },
  { web: 470, mobile: 410 },
  { web: 103, mobile: 160 },
  { web: 439, mobile: 380 },
  { web: 88, mobile: 140 },
  { web: 294, mobile: 250 },
  { web: 323, mobile: 370 },
  { web: 385, mobile: 320 },
  { web: 438, mobile: 480 },
  { web: 155, mobile: 200 },
  { web: 92, mobile: 150 },
  { web: 492, mobile: 420 },
  { web: 81, mobile: 130 },
  { web: 426, mobile: 380 },
  { web: 307, mobile: 350 },
  { web: 371, mobile: 310 },
  { web: 475, mobile: 520 },
  { web: 107, mobile: 170 },
  { web: 341, mobile: 290 },
  { web: 408, mobile: 450 },
  { web: 169, mobile: 210 },
  { web: 317, mobile: 270 },
  { web: 480, mobile: 530 },
  { web: 132, mobile: 180 },
  { web: 141, mobile: 190 },
  { web: 434, mobile: 380 },
  { web: 448, mobile: 490 },
  { web: 149, mobile: 200 },
  { web: 103, mobile: 160 },
  { web: 446, mobile: 400 },
];

const chartData = chartValues.map((values, index) => {
  const date = dayjs().subtract(chartValues.length - 1 - index, "day");

  return Object.assign({ date: date.format(`YYYY-MM-DD`) }, values);
});

export const LineChart = () => {
  const { t, i18n } = useTranslation(["common", "dashboard"]);
  const [activeChart, setActiveChart] = React.useState<"web" | "mobile">("web");

  const chartConfig = {
    views: {
      label: t("views"),
    },
    web: {
      label: "web",
      color: "var(--chart-1)",
    },
    mobile: {
      label: "mobile",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const total = {
    web: chartData.reduce((acc, curr) => acc + curr.web, 0),
    mobile: chartData.reduce((acc, curr) => acc + curr.mobile, 0),
  };

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-0.5 px-6 py-5 sm:py-6">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">
              {t("organization.home.pageViews.title")}
            </CardTitle>
            <Badge variant="destructive">
              <Icons.ArrowDown /> 33%
            </Badge>
          </div>
          <CardDescription>
            {t("organization.home.pageViews.description")}
          </CardDescription>
        </div>
        <div className="flex">
          {(["web", "mobile"] as const).map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              onClick={() => setActiveChart(key)}
            >
              <span className="text-muted-foreground text-xs">{t(key)}</span>
              <span className="text-lg leading-none font-bold sm:text-3xl">
                {total[key].toLocaleString(i18n.language)}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <RechartsLineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                return date.toLocaleDateString(i18n.language, {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value: string) => {
                    return new Date(value).toLocaleDateString(i18n.language, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Line
              dataKey={activeChart}
              type="monotone"
              stroke={chartConfig[activeChart].color}
              strokeWidth={2}
              dot={false}
            />
          </RechartsLineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
