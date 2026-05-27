import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { usePaywall } from "@workspace/billing-mobile";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui-mobile/card";
import { Text } from "@workspace/ui-mobile/text";

import { useSetupSteps } from "~/app/(setup)/steps/_layout";
import { pathsConfig } from "~/config/paths";
import { ScrollView } from "~/modules/common/styled";

type PaywallStatus = "idle" | "opening" | "dismissed" | "skipped" | "error";

export default function PaywallStep() {
  const { t, i18n } = useTranslation(["common", "billing", "marketing"]);
  const { goNext } = useSetupSteps();
  const [info, setInfo] = useState<{
    status: PaywallStatus;
    error?: Error | string | null;
    lastEventAt: Date | null;
  }>({
    status: "idle",
    error: null,
    lastEventAt: null,
  });

  const onEvent = (status: PaywallStatus, error?: Error | string | null) => {
    setInfo((prev) => ({
      ...prev,
      status,
      error,
      lastEventAt: new Date(),
    }));
  };

  const { present, result } = usePaywall({
    onPresent: () => onEvent("opening"),
    onDismiss: () => onEvent("dismissed"),
    onPurchase: () => onEvent("dismissed"),
    onRestore: () => onEvent("dismissed"),
    onSkip: () => onEvent("skipped"),
    onError: (error) => onEvent("error", error),
  });

  const data = [
    {
      label: t("status"),
      value: t(`setup.steps.step.paywall.state.status.${info.status}`),
    },
    {
      label: t("result"),
      value: t(`paywall.result.${result}`),
    },
    {
      label: t("error.label"),
      value: info.error
        ? info.error instanceof Error
          ? info.error.message
          : info.error
        : "—",
    },
    {
      label: t("lastEvent"),
      value: info.lastEventAt
        ? info.lastEventAt.toLocaleTimeString(i18n.language)
        : "—",
    },
  ];

  return (
    <>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        className="py-4"
      >
        <View className="items-start gap-1">
          <Text className="font-sans-bold text-3xl tracking-tight">
            {t("setup.steps.step.paywall.title")}
          </Text>
          <Text className="text-muted-foreground leading-snug">
            {t("setup.steps.step.paywall.description")}
          </Text>
        </View>

        <Card className="mt-6 w-full">
          <CardHeader>
            <CardTitle>{t("setup.steps.step.paywall.state.title")}</CardTitle>
            <CardDescription>
              {t("setup.steps.step.paywall.state.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            {data.map((item) => (
              <View
                className="flex-row items-center justify-between"
                key={item.label}
              >
                <Text className="text-muted-foreground text-sm">
                  {item.label}
                </Text>
                <Text className="font-sans-medium text-sm">{item.value}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      </ScrollView>

      <View className="mt-auto gap-2">
        <Button
          size="lg"
          onPress={() => {
            goNext();
            router.replace(pathsConfig.dashboard.user.index);
          }}
          variant="ghost"
        >
          <Text>{t("skip")}</Text>
        </Button>
        <Button
          className="mt-auto"
          size="lg"
          onPress={() => {
            onEvent("opening");
            void present({ trigger: "onboarding" });
          }}
        >
          <Text>{t("setup.steps.step.paywall.cta")}</Text>
        </Button>
      </View>
    </>
  );
}
