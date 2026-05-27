import { LinearGradient, matchFont, vec } from "@shopify/react-native-skia";
import dayjs from "dayjs";
import { useState } from "react";
import { Platform, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { CartesianChart, StackedArea } from "victory-native";

import { useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-mobile/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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

export function AreaChart() {
  const { t, i18n } = useTranslation(["common", "dashboard"]);
  const mutedForeground = useCSSVariable("--muted-foreground");
  const color1 = useCSSVariable("--chart-1");
  const color4 = useCSSVariable("--chart-4");

  const [timeRange, setTimeRange] = useState("90d");

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
    mobile: {
      label: t("mobile"),
      color: color4,
    },
    web: {
      label: t("web"),
      color: color1,
    },
  } as const;

  const options = [
    {
      value: "90d",
      label: t("common:lastMonths", { count: 3 }),
    },
    {
      value: "30d",
      label: t("common:lastMonths", { count: 1 }),
    },
    {
      value: "7d",
      label: t("common:lastDays", { count: 7 }),
    },
  ] as const;

  return (
    <Card className="w-full">
      <CardHeader className="items-center gap-4">
        <View className="items-center">
          <View className="flex-row items-center gap-2">
            <CardTitle>{t("organization.home.visitors.title")}</CardTitle>
            <Badge variant="success">
              <Icons.ArrowUp size={12} className="text-success" />
              <Text>67%</Text>
            </Badge>
          </View>
          <CardDescription>
            {t("organization.home.visitors.description")}
          </CardDescription>
        </View>

        <Select
          value={{
            value: timeRange,
            label:
              options.find((option) => option.value === timeRange)?.label ?? "",
          }}
          onValueChange={(option) => setTimeRange(option?.value ?? "90d")}
        >
          <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto">
            <SelectValue
              placeholder={
                options.find((option) => option.value === timeRange)?.label ??
                ""
              }
              className="text-foreground"
            />
          </SelectTrigger>
          <SelectContent
            className="w-[160px] rounded-xl"
            align="start"
            sideOffset={4}
          >
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                label={option.label}
                className="rounded-lg"
              >
                <Text>{option.label}</Text>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="h-[250px] px-4">
        <CartesianChart
          data={filteredData}
          xKey="date"
          yKeys={["web", "mobile"]}
          padding={{ bottom: 12 }}
          domainPadding={{ top: 200 }}
          xAxis={{
            font: matchFont({
              fontFamily: Platform.select({
                android: "helvetica",
                ios: "Helvetica Neue",
              }),
              fontSize: 12,
            }),
            labelOffset: 4,
            lineWidth: 0,
            formatXLabel: (value) => {
              const date = new Date(value);
              return date.toLocaleDateString(i18n.language, {
                month: "short",
                day: "numeric",
              });
            },
            labelColor: mutedForeground?.toString(),
          }}
        >
          {({ points, chartBounds }) => (
            <>
              <StackedArea
                points={[points.web, points.mobile]}
                y0={chartBounds.bottom}
                curveType="basis"
                animate={{ type: "timing" }}
                areaOptions={({ rowIndex, lowestY, highestY }) => {
                  const color =
                    Object.values(chartConfig)[rowIndex]?.color ?? color1;

                  switch (rowIndex) {
                    case 0:
                      return {
                        children: (
                          <LinearGradient
                            start={vec(0, highestY - 50)}
                            end={vec(0, lowestY)}
                            colors={[
                              color?.toString() ?? "",
                              `${color?.toString() ?? ""}4d`,
                            ]}
                          />
                        ),
                      };
                    case 1:
                      return {
                        children: (
                          <LinearGradient
                            start={vec(0, highestY - 100)}
                            end={vec(0, lowestY)}
                            colors={[
                              color?.toString() ?? "",
                              `${color?.toString() ?? ""}4d`,
                            ]}
                          />
                        ),
                      };
                    default:
                      return {};
                  }
                }}
              />
            </>
          )}
        </CartesianChart>
      </CardContent>

      <CardFooter className="mx-auto -mt-2 flex-row items-center gap-4">
        {Object.values(chartConfig).map((config) => (
          <View key={config.color} className="flex-row items-center gap-2">
            <View
              className="size-3 rounded-sm"
              style={{ backgroundColor: config.color?.toString() }}
            />
            <Text className="text-sm">{config.label}</Text>
          </View>
        ))}
      </CardFooter>
    </Card>
  );
}
