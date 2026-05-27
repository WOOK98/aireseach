import { useTranslation } from "@workspace/i18n";
import {
  BottomSheet,
  BottomSheetCloseTrigger,
  BottomSheetContent,
  BottomSheetOpenTrigger,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetView,
  useBottomSheet,
  BottomSheetHeader,
} from "@workspace/ui-mobile/bottom-sheet";
import { Button } from "@workspace/ui-mobile/button";
import { LocaleCustomizer, LocaleIcon } from "@workspace/ui-mobile/i18n";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import { useI18nConfig } from "~/lib/providers/i18n";
import { SettingsTile } from "~/modules/common/settings-tile";

export const I18nSettings = () => {
  const { t, i18n } = useTranslation("common");
  const { setConfig } = useI18nConfig();

  const { ref } = useBottomSheet();

  const Icon =
    i18n.language && i18n.language in LocaleIcon
      ? LocaleIcon[i18n.language as keyof typeof LocaleIcon]
      : null;

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <SettingsTile icon={Icons.Languages}>
          <Text>{t("language.label")}</Text>
          {Icon && <Icon className="size-4.5" />}
        </SettingsTile>
      </BottomSheetOpenTrigger>
      <BottomSheetContent ref={ref} name="i18n">
        <BottomSheetView>
          <BottomSheetHeader>
            <BottomSheetTitle>{t("language.label")}</BottomSheetTitle>
            <BottomSheetDescription>
              {t("language.description")}
            </BottomSheetDescription>
          </BottomSheetHeader>

          <LocaleCustomizer onChange={(locale) => setConfig({ locale })} />

          <BottomSheetCloseTrigger asChild>
            <Button>
              <Text>{t("save")}</Text>
            </Button>
          </BottomSheetCloseTrigger>
        </BottomSheetView>
      </BottomSheetContent>
    </BottomSheet>
  );
};
