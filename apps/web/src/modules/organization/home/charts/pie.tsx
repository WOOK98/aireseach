"use client";

import dayjs from "dayjs";
import * as React from "react";
import { Label, Pie, PieChart as RechartsPieChart, Sector } from "recharts";

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
  ChartStyle,
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
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

const customersValue = [186, 305, 237, 173, 209];

const useChartData = (locale: string) => {
  const labelFormatter = new Intl.DateTimeFormat(locale, {
    month: "long",
  });

  const monthData = Array.from({ length: customersValue.length }, (_, i) => {
    const date = dayjs().subtract(customersValue.length - 1 - i, "month");
    return {
      id: date.format("YYYY-MM"),
      label: labelFormatter.format(date.toDate()),
    };
  }).reverse();

  const customersData = monthData.map((month, index) => ({
    month: month.id,
    customers: customersValue[index] ?? 0,
    fill: `var(--chart-${index + 1})`,
  }));

  const chartConfig = monthData.reduce((config, month, idx) => {
    config[month.id] = {
      label: month.label,
      color: `var(--chart-${idx + 1})`,
    };
    return config;
  }, {} as ChartConfig);

  const items = monthData.map((month) => {
    const config = chartConfig[month.id];
    return {
      value: month.id,
      label: (
        <div className="flex items-center gap-2 text-sm">
          <span
            className="flex h-3 w-3 shrink-0 rounded-sm"
            style={{
              backgroundColor:
                config && "color" in config ? config.color : undefined,
            }}
          />
          {config?.label ?? month.label}
        </div>
      ),
    };
  });

  return {
    chartConfig,
    customersData,
    items,
    defaultMonth: customersData[0]?.month ?? "",
  };
};

export function PieChart() {
  const { t, i18n } = useTranslation(["common", "dashboard"]);
  const id = "pie-interactive";
  const { chartConfig, customersData, items, defaultMonth } = useChartData(
    i18n.language,
  );
  const [activeMonth, setActiveMonth] = React.useState(defaultMonth);

  React.useEffect(() => {
    setActiveMonth((current) =>
      customersData.some((item) => item.month === current)
        ? current
        : defaultMonth,
    );
  }, [defaultMonth, customersData]);

  const activeIndex = React.useMemo(
    () => customersData.findIndex((item) => item.month === activeMonth),
    [activeMonth, customersData],
  );
  return (
    <Card className="flex flex-col">
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader className="flex-row flex-wrap items-start gap-2 space-y-0 pb-0">
        <div className="grid gap-0.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl leading-tight">
              {t("organization.home.customers.title")}
            </CardTitle>
            <Badge variant="destructive">
              <Icons.ArrowDown /> 17%
            </Badge>
          </div>
          <CardDescription>
            {t("organization.home.customers.description")}
          </CardDescription>
        </div>
        <Select
          items={items}
          value={activeMonth}
          onValueChange={(value) =>
            setActiveMonth(value ?? customersData[0]?.month ?? "")
          }
        >
          <SelectTrigger
            className="ml-auto rounded-lg pl-3"
            aria-label={t("selectMonth")}
            size="sm"
          >
            <SelectValue placeholder={t("selectMonth")} />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {items.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className="rounded-lg [&_span]:flex"
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          id={id}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <RechartsPieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={customersData}
              dataKey="customers"
              nameKey="month"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const data = customersData[activeIndex];
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
                          className="fill-foreground text-3xl font-bold"
                        >
                          {data.customers.toLocaleString(i18n.language)}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 24}
                          className="fill-muted-foreground"
                        >
                          {t("customers")}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </RechartsPieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
