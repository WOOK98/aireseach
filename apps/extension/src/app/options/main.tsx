import { Layout, render } from "~/modules/common/layout/layout";
import { Main } from "~/modules/common/main";

const Options = () => {
  return (
    <Layout className="p-8">
      <Main filename="app/options" />
    </Layout>
  );
};

render("root", <Options />);
