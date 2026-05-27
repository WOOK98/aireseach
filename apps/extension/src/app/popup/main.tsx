import { Layout, render } from "~/modules/common/layout/layout";
import { Main } from "~/modules/common/main";

const Popup = () => {
  return (
    <Layout>
      <Main className="w-92 px-4" filename="app/popup" />
    </Layout>
  );
};

render("root", <Popup />);
