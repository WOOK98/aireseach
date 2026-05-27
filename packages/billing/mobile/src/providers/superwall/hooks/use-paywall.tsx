import { usePlacement } from "expo-superwall";

import { PaywallResult } from "../../../types";

import type { PaywallCallbacks } from "../../../types";
import type { Override } from "@workspace/shared/types";
import type {
  PaywallState,
  RegisterPlacementArgs,
  usePlacementCallbacks,
} from "expo-superwall";

const toPaywallResult = (state: PaywallState): PaywallResult => {
  switch (state.status) {
    case "idle":
      return PaywallResult.IDLE;
    case "presented":
      return PaywallResult.IDLE;
    case "dismissed":
      if (state.result.type === "purchased") return PaywallResult.PURCHASED;
      if (state.result.type === "restored") return PaywallResult.RESTORED;
      return PaywallResult.DISMISSED;
    case "skipped":
      return PaywallResult.SKIPPED;
    case "error":
      return PaywallResult.ERROR;
  }
};

type UsePaywallArgs = Override<PaywallCallbacks, usePlacementCallbacks>;

export function usePaywall(args?: UsePaywallArgs) {
  const { registerPlacement, state } = usePlacement(
    args
      ? {
          ...args,
          onDismiss: (paywallInfo, result) => {
            args.onDismiss?.(paywallInfo, result);

            if (result.type === "purchased") {
              args.onPurchase?.(paywallInfo, result);
            }

            if (result.type === "restored") {
              args.onRestore?.(paywallInfo, result);
            }
          },
        }
      : undefined,
  );

  const present = async ({
    trigger,
    ...params
  }: Omit<RegisterPlacementArgs, "placement"> & { trigger: string }) => {
    await registerPlacement({ ...params, placement: trigger });
  };

  return { present, result: toPaywallResult(state) };
}
