"use client";

import {
  BillingReference,
  BillingType,
  getAvailableTypes,
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

export const TypeSelector = () => {
  const { t } = useTranslation(["billing", "common"]);
  const { controls, setControls } = usePricingControls();

  const items = getAvailableTypes().map((type) => ({
    label: t(`type.${type}`),
    value: type,
  }));

  return (
    <div className="flex flex-col items-start gap-2">
      <Label htmlFor="type-selector">{t("common:type")}</Label>
      <Select
        id="type-selector"
        items={items}
        value={controls.type}
        onValueChange={(value) => value && setControls({ type: value })}
      >
        <SelectTrigger className="min-w-40">
          <SelectValue placeholder={t("common:type")} />
        </SelectTrigger>
        <SelectContent align="start">
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              disabled={
                controls.referenceType !== BillingReference.ORGANIZATION &&
                item.value === BillingType.PER_SEAT
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
