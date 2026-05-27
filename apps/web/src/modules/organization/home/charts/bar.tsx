"use client";

import dayjs from "dayjs";
import * as React from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Rectangle,
  XAxis,
} from "recharts";

import { useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-web/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

const revenueValues = [1870, 2000, 2370, 1730, 900];

const useChartData = (locale: string) => {
  const labelFormatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "2-digit",
  });

  const monthData = Array.from({ length: revenueValues.length }, (_, i) => {
    const date = dayjs().subtract(revenueValues.length - 1 - i, "month");
    return {
      id: date.format("YYYY-MM"),
      label: labelFormatter.format(date.toDate()),
    };
  });

  const chartData = monthData.map((month, index) => ({
    month: month.id,
    revenue: revenueValues[index] ?? 0,
    fill: `var(--chart-${index + 1})`,
  }));

  const chartConfig = monthData.reduce((config, month, idx) => {
    config[month.id] = {
      label: month.label,
      color: `var(--chart-${idx + 1})`,
    };
    return config;
  }, {} as ChartConfig);

  return { chartData, chartConfig };
};

export function BarChart() {
  const { t, i18n } = useTranslation(["common", "dashboard"]);
  const { chartData, chartConfig } = useChartData(i18n.language);

  return (
    <Card>
      <CardHeader className="space-y-0.5">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl leading-tight">
            {t("organization.home.mrr.title")}
          </CardTitle>
          <Badge variant="success">
            <Icons.ArrowUp /> 22%
          </Badge>
        </div>
        <CardDescription>
          {t("organization.home.mrr.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            revenue: {
              label: t("revenue"),
            },
            ...chartConfig,
          }}
        >
          <RechartsBarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                chartConfig[value as keyof typeof chartConfig]?.label as string
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, _, item) => (
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2.5 rounded-[2px] border"
                        style={{
                          backgroundColor: item.payload.fill,
                          borderColor: item.payload.fill,
                        }}
                      />
                      {dayjs(item.payload.month as string).format("MMMM")}
                      <span className="text-foreground ml-auto block font-mono font-medium tabular-nums">
                        {new Intl.NumberFormat(i18n.language, {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }).format(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="revenue"
              strokeWidth={2}
              radius={8}
              activeIndex={2}
              activeBar={({ ...props }) => {
                return (
                  <Rectangle
                    {...props}
                    fillOpacity={0.8}
                    stroke={props.payload.fill}
                    strokeDasharray={4}
                    strokeDashoffset={4}
                  />
                );
              }}
            />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start text-sm">
        <div className="flex gap-2 font-medium">
          {t("trendingUp", { percentage: 22 })}{" "}
          <Icons.TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground">
          {t("organization.home.mrr.label")}
        </div>
      </CardFooter>
    </Card>
  );
}
