"use client";

import { getAvailableIntervals } from "@workspace/billing";
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

export const IntervalSelector = () => {
  const { t } = useTranslation("common");
  const { controls, setControls } = usePricingControls();

  const items = getAvailableIntervals().map((interval) => ({
    label: <span className="capitalize">{t(interval)}</span>,
    value: interval,
  }));

  return (
    <div className="flex flex-col items-start gap-2">
      <Label htmlFor="interval-selector">{t("interval")}</Label>
      <Select
        id="interval-selector"
        items={items}
        value={controls.interval}
        onValueChange={(value) => value && setControls({ interval: value })}
      >
        <SelectTrigger className="min-w-40">
          <SelectValue placeholder={t("interval")} />
        </SelectTrigger>
        <SelectContent align="start">
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
