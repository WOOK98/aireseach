import { getMetadata } from "~/lib/metadata";
import { ReportGenerator } from "~/modules/report/report-generator";

export const generateMetadata = getMetadata({
  title: "AI 商业分析报告",
  description: "AI Agent 深度商业分析报告生成器",
});

export default function ReportPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          AI 商业分析报告系统
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          先搭建指标骨架，再生成市场份额、竞争格局、抗脆弱性和投资建议
        </p>
      </div>
      <ReportGenerator />
    </div>
  );
}
