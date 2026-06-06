import { redirect } from "next/navigation";

import { getMetadata } from "~/lib/metadata";

export const generateMetadata = getMetadata({
  title: "marketing:report.title",
  description: "marketing:report.description",
});

interface ReportPageProps {
  readonly searchParams: Promise<{
    target?: string;
  }>;
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const { target } = await searchParams;

  if (target) {
    redirect(`/dashboard/report?target=${encodeURIComponent(target)}`);
  }

  redirect("/dashboard/report");
}
