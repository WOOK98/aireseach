import { getMetadata } from "~/lib/metadata";
import { AreaChart } from "~/modules/organization/home/charts/area";
import { BarChart } from "~/modules/organization/home/charts/bar";
import { LineChart } from "~/modules/organization/home/charts/line";
import { PieChart } from "~/modules/organization/home/charts/pie";
import { RadarChart } from "~/modules/organization/home/charts/radar";
import { RadialChart } from "~/modules/organization/home/charts/radial";
import { ShapeChart } from "~/modules/organization/home/charts/shape";

export const generateMetadata = getMetadata({
  title: "common:home",
  description: "dashboard:organization.home.description",
});

export default function OrganizationPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col flex-wrap gap-4 *:grow *:basis-80 lg:flex-row">
        <BarChart />
        <PieChart />
        <ShapeChart />
      </div>
      <AreaChart />
      <div className="flex flex-col flex-wrap gap-4 *:grow *:basis-80 lg:flex-row">
        <RadialChart />
        <RadarChart />
      </div>
      <LineChart />
    </div>
  );
}
