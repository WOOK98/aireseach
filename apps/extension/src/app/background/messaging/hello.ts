import { getI18n } from "@workspace/i18n";

import { getLocale } from "~/lib/i18n";
import { Message, onMessage } from "~/lib/messaging";

const getMessage = async (filename: string) => {
  const locale = await getLocale();
  const { t } = await getI18n({ locale, ns: "marketing" });

  return t("editToReload", "", { file: filename });
};

onMessage(Message.HELLO, ({ data }) => getMessage(data));
