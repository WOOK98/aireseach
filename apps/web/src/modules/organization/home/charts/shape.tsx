"use client";

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
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
import { ChartContainer } from "@workspace/ui-web/chart";
import { Icons } from "@workspace/ui-web/icons";

import type { ChartConfig } from "@workspace/ui-web/chart";

const chartData = [{ metric: "activation", value: 68, fill: "var(--chart-2)" }];

export function ShapeChart() {
  const { t, i18n } = useTranslation(["common", "dashboard"]);
  const chartConfig = {
    activation: {
      label: t("organization.home.activation.label"),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;
  const percentFormatter = new Intl.NumberFormat(i18n.language, {
    style: "percent",
    maximumFractionDigits: 0,
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center space-y-0.5 pb-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl leading-tight">
            {t("organization.home.activation.title")}
          </CardTitle>
          <Badge variant="success">
            <Icons.ArrowUp /> 8%
          </Badge>
        </div>
        <CardDescription>
          {t("organization.home.activation.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={chartData}
            endAngle={100}
            innerRadius={80}
            outerRadius={140}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="value" background />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const data = chartData[0];
                    if (!data) return null;

                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {percentFormatter.format(data.value / 100)}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 24}
                          className="fill-muted-foreground"
                        >
                          {t("organization.home.activation.label")}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {t("trendingUp", { percentage: 8 })}{" "}
          <Icons.TrendingUp className="h-4 w-4" />
        </div>
      </CardFooter>
    </Card>
  );
}
