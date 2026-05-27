import { matchFont } from "@shopify/react-native-skia";
import dayjs from "dayjs";
import { Platform, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { Bar, CartesianChart } from "victory-native";

import { useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-mobile/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardContent,
} from "@workspace/ui-mobile/card";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

const revenueValues = [1870, 2000, 2370, 1730, 900];

const useChartData = (locale: string) => {
  const colors = [
    useCSSVariable("--chart-1"),
    useCSSVariable("--chart-2"),
    useCSSVariable("--chart-3"),
    useCSSVariable("--chart-4"),
    useCSSVariable("--chart-5"),
  ];
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

  return monthData.map((month, index) => ({
    month: month.id,
    label: month.label,
    revenue: revenueValues[index] ?? 0,
    color: colors[index],
  }));
};

export function BarChart() {
  const { t, i18n } = useTranslation(["common", "dashboard"]);
  const mutedForeground = useCSSVariable("--muted-foreground");

  const chartData = useChartData(i18n.language);

  return (
    <Card className="w-full">
      <CardHeader className="gap-0">
        <View className="flex-row items-center gap-2">
          <CardTitle>{t("organization.home.mrr.title")}</CardTitle>
          <Badge variant="success">
            <Icons.ArrowUp size={12} className="text-success" />
            <Text>22%</Text>
          </Badge>
        </View>
        <CardDescription>
          {t("organization.home.mrr.description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="h-[200px] px-5">
        <CartesianChart
          data={chartData}
          xKey="month"
          yKeys={["revenue"]}
          domainPadding={{ left: 35, right: 35, bottom: 25 }}
          padding={{ bottom: 12 }}
          xAxis={{
            font: matchFont({
              fontFamily: Platform.select({
                android: "helvetica",
                ios: "Helvetica Neue",
              }),
              fontSize: 12,
            }),
            lineWidth: 0,
            formatXLabel: (value) =>
              chartData.find((data) => data.month === value)?.label ?? value,
            labelOffset: 6,
            labelColor: mutedForeground?.toString(),
          }}
        >
          {({ points, chartBounds }) => {
            return points.revenue.map((point) => {
              return (
                <Bar
                  key={point.xValue}
                  barCount={points.revenue.length}
                  chartBounds={chartBounds}
                  points={[point]}
                  innerPadding={0.15}
                  roundedCorners={{
                    topLeft: 10,
                    topRight: 10,
                  }}
                  color={
                    chartData.find((data) => data.month === point.xValue)?.color
                  }
                />
              );
            });
          }}
        </CartesianChart>
      </CardContent>

      <CardFooter className="flex-col items-start">
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-medium text-sm">
            {t("trendingUp", { percentage: 22 })}
          </Text>
          <Icons.TrendingUp size={16} className="text-foreground" />
        </View>
        <Text className="text-muted-foreground text-sm">
          {t("organization.home.mrr.label")}
        </Text>
      </CardFooter>
    </Card>
  );
}
