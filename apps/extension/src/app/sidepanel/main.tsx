import { Layout, render } from "~/modules/common/layout/layout";
import { Main } from "~/modules/common/main";

const SidePanel = () => {
  return (
    <Layout className="p-8">
      <Main filename="app/sidepanel" />
    </Layout>
  );
};

render("root", <SidePanel />);
