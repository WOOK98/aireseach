import dayjs from "dayjs";
import { useState } from "react";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";
import { Pie, PolarChart } from "victory-native";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Badge } from "@workspace/ui-mobile/badge";
import {
  CardDescription,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui-mobile/card";
import { Icons } from "@workspace/ui-mobile/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui-mobile/select";
import { Text } from "@workspace/ui-mobile/text";

const customersValue = [186, 305, 237, 173, 209];

const useChart = (locale: string) => {
  const colors = [
    useCSSVariable("--chart-1"),
    useCSSVariable("--chart-2"),
    useCSSVariable("--chart-3"),
    useCSSVariable("--chart-4"),
    useCSSVariable("--chart-5"),
  ];
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
    color: colors[index]?.toString() ?? "",
  }));

  const config = monthData.reduce(
    (acc, month, index) => {
      acc[month.id] = {
        label: month.label,
        color: colors[index]?.toString(),
      };
      return acc;
    },
    {} as Record<string, { label: string; color?: string | null }>,
  );

  return { customersData, config };
};

export function PieChart() {
  const { t, i18n } = useTranslation(["common", "dashboard"]);
  const backgroundColor = useCSSVariable("--background");

  const { customersData, config } = useChart(i18n.language);
  const [activeMonth, setActiveMonth] = useState(customersData[0]?.month ?? "");

  const months = customersData.map((item) => item.month);

  return (
    <Card className="w-full pb-2">
      <CardHeader className="flex-row items-start justify-between gap-0.5">
        <View>
          <View className="flex-row items-center gap-2">
            <CardTitle>{t("organization.home.customers.title")}</CardTitle>
            <Badge variant="destructive">
              <Icons.ArrowDown size={12} className="text-destructive" />
              <Text>17%</Text>
            </Badge>
          </View>
          <CardDescription>
            {t("organization.home.customers.description")}
          </CardDescription>
        </View>

        <Select
          value={{
            value: activeMonth,
            label: config[activeMonth]?.label ?? "",
          }}
          onValueChange={(option) =>
            setActiveMonth(option?.value ?? customersData[0]?.month ?? "")
          }
        >
          <SelectTrigger
            className="ml-auto rounded-lg"
            aria-label={t("selectMonth")}
          >
            <View
              className="size-3 shrink-0 rounded-sm"
              style={{
                backgroundColor: config[activeMonth]?.color?.toString(),
              }}
            />
            <SelectValue
              placeholder={t("selectMonth")}
              className="text-foreground"
            />
          </SelectTrigger>
          <SelectContent className="rounded-xl" align="end" sideOffset={4}>
            {months.map((month) => {
              const monthConfig = config[month];
              return (
                <SelectItem
                  key={month}
                  value={month}
                  label={monthConfig?.label ?? month}
                >
                  <View className="flex-row items-center gap-2">
                    <View
                      className={cn("size-3 shrink-0 rounded-sm")}
                      style={{
                        backgroundColor: monthConfig?.color?.toString(),
                      }}
                    />
                    <Text className="text-sm">
                      {monthConfig?.label ?? month}
                    </Text>
                  </View>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="relative h-[250px]">
        <PolarChart
          data={[...customersData].reverse()}
          labelKey="month"
          valueKey="customers"
          colorKey="color"
        >
          <Pie.Chart innerRadius="50%">
            {({ slice }) => (
              <>
                <Pie.Slice key={slice.value} />
                {activeMonth === slice.label && (
                  <Pie.SliceAngularInset
                    angularInset={{
                      angularStrokeWidth: 8,
                      angularStrokeColor: backgroundColor?.toString() ?? "",
                    }}
                  />
                )}
              </>
            )}
          </Pie.Chart>
        </PolarChart>

        <View className="absolute inset-0 items-center justify-center">
          <Text className="font-sans-bold text-foreground -mt-3 text-3xl">
            {customersData
              .find((data) => data.month === activeMonth)
              ?.customers.toLocaleString(i18n.language)}
          </Text>
          <Text className="text-muted-foreground text-xs leading-none">
            {t("customers")}
          </Text>
        </View>
      </CardContent>
    </Card>
  );
}
