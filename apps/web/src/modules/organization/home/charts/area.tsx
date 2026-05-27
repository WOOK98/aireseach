"use client";

import dayjs from "dayjs";
import * as React from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui-web/chart";
import { Icons } from "@workspace/ui-web/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui-web/select";

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

export const AreaChart = () => {
  const { t, i18n } = useTranslation(["common", "dashboard"]);
  const [timeRange, setTimeRange] = React.useState("90d");

  const filteredData = chartData.filter((item) => {
    const date = dayjs(item.date);
    const referenceDate = dayjs();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    const startDate = referenceDate.subtract(daysToSubtract, "day");
    return date.isAfter(startDate, "day") || date.isSame(startDate, "day");
  });

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

  const options = [
    {
      value: "90d",
      label: t("lastMonths", { count: 3 }),
    },
    {
      value: "30d",
      label: t("lastMonths", { count: 1 }),
    },
    {
      value: "7d",
      label: t("lastDays", { count: 7 }),
    },
  ] as const;

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="flex flex-1 flex-col items-center gap-0.5 sm:items-start">
          <div className="flex w-fit items-center gap-2">
            <CardTitle className="text-xl">
              {t("organization.home.visitors.title")}
            </CardTitle>
            <Badge variant="success">
              <Icons.ArrowUp /> 67%
            </Badge>
          </div>
          <CardDescription>
            {t("organization.home.visitors.description")}
          </CardDescription>
        </div>
        <Select
          items={options}
          value={timeRange}
          onValueChange={(value) => setTimeRange(value ?? "90d")}
        >
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a value"
          >
            <SelectValue
              placeholder={
                options.find((option) => option.value === timeRange)?.label
              }
            />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="rounded-lg"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <RechartsAreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillWeb" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-web)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-web)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
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
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value: string) => {
                    return new Date(value).toLocaleDateString(i18n.language, {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="web"
              type="natural"
              fill="url(#fillWeb)"
              stroke="var(--color-web)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </RechartsAreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
