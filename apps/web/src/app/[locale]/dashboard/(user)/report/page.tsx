import { getMetadata } from "~/lib/metadata";
import { ReportGenerator } from "~/modules/report/report-generator";

export const generateMetadata = getMetadata({
  title: "商业分析报告",
  description: "AI Agent 深度商业分析报告生成器",
});

export default function ReportPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">商业分析报告</h2>
      </div>
      <ReportGenerator />
    </div>
  );
}
