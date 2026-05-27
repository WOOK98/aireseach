"use client";

import {
  BillingModel,
  BillingType,
  getAvailableModels,
  RecurringInterval,
} from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { Label } from "@workspace/ui-web/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui-web/select";

import { usePricingControls } from ".";

export const ModelSelector = () => {
  const { t } = useTranslation(["billing", "common"]);
  const { controls, setControls } = usePricingControls();

  const items = getAvailableModels().map((model) => ({
    label: t(`model.${model}`),
    value: model,
  }));

  return (
    <div className="flex flex-col items-start gap-2">
      <Label htmlFor="mode-selector">{t("common:model")}</Label>
      <Select
        id="mode-selector"
        items={items}
        value={controls.model}
        onValueChange={(value) =>
          value &&
          setControls({
            model: value,
            ...(value === BillingModel.ONE_TIME
              ? { interval: null }
              : {
                  interval: controls.interval ?? RecurringInterval.MONTH,
                }),
          })
        }
      >
        <SelectTrigger className="min-w-40">
          <SelectValue placeholder={t("common:model")} />
        </SelectTrigger>
        <SelectContent align="start">
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              disabled={
                controls.type === BillingType.METERED &&
                item.value === BillingModel.ONE_TIME
              }
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
