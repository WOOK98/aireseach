import { Layout, render } from "~/modules/common/layout/layout";
import { Main } from "~/modules/common/main";

const Tabs = () => {
  return (
    <Layout className="p-8">
      <Main filename="app/tabs" />
    </Layout>
  );
};

render("root", <Tabs />);
