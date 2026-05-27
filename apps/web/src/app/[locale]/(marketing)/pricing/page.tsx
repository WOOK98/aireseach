import { getMetadata } from "~/lib/metadata";
import { Pricing } from "~/modules/billing/pricing/pricing";

export const generateMetadata = getMetadata({
  title: "billing:pricing.label",
  description: "billing:pricing.description",
});

const PricingPage = () => {
  return <Pricing />;
};

export default PricingPage;
