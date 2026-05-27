import { Layout, render } from "~/modules/common/layout/layout";
import { Main } from "~/modules/common/main";

const NewTab = () => {
  return (
    <Layout className="p-8">
      <Main filename="app/newtab" />
    </Layout>
  );
};

render("root", <NewTab />);
