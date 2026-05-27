import React from "react";
import { browser } from "wxt/browser";

import { Layout, render } from "~/modules/common/layout/layout";
import { Main } from "~/modules/common/main";

import env from "../../../env.config";

browser.devtools.panels.create(
  env.VITE_PRODUCT_NAME,
  "icons/128.png",
  "devtools.html",
);

browser.devtools.panels.elements.createSidebarPane(
  env.VITE_PRODUCT_NAME,
  (sidebar) =>
    sidebar.setObject({
      name: "DevTools",
    }),
);

const DevTools = () => {
  return (
    <Layout>
      <Main filename="app/devtools" />
    </Layout>
  );
};

render("root", <DevTools />);
