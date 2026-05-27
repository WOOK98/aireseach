import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import { Text } from "@workspace/ui-mobile/text";

import { useSetupSteps } from "~/app/(setup)/steps/_layout";
import { ScrollView } from "~/modules/common/styled";

export default function StartStep() {
  const { t } = useTranslation(["common", "marketing"]);
  const { goNext } = useSetupSteps();

  return (
    <>
      <ScrollView
        className="py-4"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-start gap-1">
          <Text className="font-sans-bold text-3xl tracking-tight">
            {t("setup.steps.step.start.title")}
          </Text>
          <Text className="text-muted-foreground leading-snug">
            {t("setup.steps.step.start.description")}
          </Text>
        </View>
      </ScrollView>

      <Button className="mt-auto" size="lg" onPress={() => goNext()}>
        <Text>{t("continue")}</Text>
      </Button>
    </>
  );
}
