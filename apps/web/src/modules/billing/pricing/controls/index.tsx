import { useEffect } from "react";
import { create } from "zustand";

import { User } from "@workspace/auth";
import {
  BillingModel,
  BillingReference,
  RecurringInterval,
  BillingType,
} from "@workspace/billing";

import { IntervalSelector } from "./interval-selector";
import { ModelSelector } from "./model-selector";
import { ReferenceSelector } from "./reference-selector";
import { TypeSelector } from "./type-selector";

interface PricingControls {
  model: BillingModel;
  interval: RecurringInterval | null;
  type: BillingType;
  referenceType: BillingReference;
  referenceId: string | null;
}

export const usePricingControls = create<{
  controls: PricingControls;
  setControls: (controls: Partial<PricingControls>) => void;
}>((set) => ({
  controls: {
    model: BillingModel.RECURRING,
    interval: RecurringInterval.MONTH,
    type: BillingType.FLAT,
    referenceType: BillingReference.USER,
    referenceId: null,
  },
  setControls: (controls) =>
    set((state) => ({ controls: { ...state.controls, ...controls } })),
}));

export const PricingControls = ({ user }: { user: User | null }) => {
  const { controls, setControls } = usePricingControls();

  useEffect(() => {
    if (controls.referenceType === BillingReference.USER && user?.id) {
      setControls({ referenceId: user.id });
    }

    if (!user?.id && controls.referenceId) {
      setControls({ referenceType: BillingReference.USER, referenceId: null });
    }

    if (
      controls.referenceType === BillingReference.USER &&
      controls.type === BillingType.PER_SEAT
    ) {
      setControls({ type: BillingType.FLAT });
    }

    if (
      controls.type === BillingType.METERED &&
      controls.model === BillingModel.ONE_TIME
    ) {
      setControls({
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH,
      });
    }
  }, [
    controls.referenceType,
    controls.referenceId,
    controls.type,
    controls.model,
    user?.id,
    setControls,
  ]);

  return (
    <div className="mt-2 flex w-full flex-wrap items-center justify-center gap-4 lg:mt-4">
      <ReferenceSelector />
      <TypeSelector />
      <ModelSelector />
      {controls.model === BillingModel.RECURRING && <IntervalSelector />}
    </div>
  );
};
