/* eslint-disable i18next/no-literal-string */
import ReactDOM from "react-dom/client";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";

import { logger } from "@workspace/shared/logger";
import { Button } from "@workspace/ui-web/button";

import "~/assets/styles/globals.css";

const ContentScriptUI = () => {
  return (
    <Button onClick={() => alert("This is injected UI!")}>
      Content script UI
    </Button>
  );
};

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main(ctx) {
    logger.info(
      "Content script is running! Edit `app/content` and save to reload.",
    );

    const ui = await createShadowRootUi(ctx, {
      name: "turbostarter-extension",
      position: "overlay",
      anchor: "body",
      onMount: (container) => {
        const app = document.createElement("div");
        container.append(app);

        const root = ReactDOM.createRoot(app);
        root.render(<ContentScriptUI />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
