import { getMetadata } from "~/lib/metadata";
import { AIDemo } from "~/modules/marketing/ai-demo";

export const generateMetadata = getMetadata({
  title: "Research Assistant",
  description:
    "Ask your AI stock analyst anything about markets, companies, and investment theses.",
});

export default function AI() {
  return <AIDemo />;
}
