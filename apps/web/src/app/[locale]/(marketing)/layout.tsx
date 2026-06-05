import { appConfig } from "~/config/app";
import { Footer } from "~/modules/marketing/layout/footer";
import { Header } from "~/modules/marketing/layout/header/header";
import { BreadcrumbJsonLd } from "~/modules/marketing/layout/json-ld";

export default function MainLayout(props: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", url: appConfig.url }]} />
      <Header />
      <main className="w-full">{props.children}</main>
      <Footer />
    </>
  );
}
