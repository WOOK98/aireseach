import { View } from "react-native";

import { BuiltWith } from "@workspace/ui-mobile/built-with";

import { ScrollView } from "~/modules/common/styled";
import { AreaChart } from "~/modules/home/charts/area";
import { BarChart } from "~/modules/home/charts/bar";
import { PieChart } from "~/modules/home/charts/pie";

export default function Home() {
  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="gap-4 items-center bg-background px-6 py-2"
      showsVerticalScrollIndicator={false}
    >
      <BarChart />
      <PieChart />
      <AreaChart />

      <View className="pt-4 pb-10">
        <BuiltWith />
      </View>
    </ScrollView>
  );
}
