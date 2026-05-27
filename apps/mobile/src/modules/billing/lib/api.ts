import { mutationOptions, queryOptions } from "@tanstack/react-query";

import { getBillingSummaryResponseSchema } from "@workspace/api/schema";
import { handle } from "@workspace/api/utils";

import { api } from "~/lib/api";

import type { InferRequestType } from "hono/client";

const KEY = "billing";

const queries = {
  summary: {
    get: (referenceId?: string) =>
      queryOptions({
        queryKey: [KEY, "summary", referenceId],
        queryFn: () =>
          handle(api.billing.summary.$get, {
            schema: getBillingSummaryResponseSchema,
          })({
            query: referenceId ? { referenceId } : {},
          }),
      }),
  },
  usage: {
    getByMeterId: (
      meterId: string,
      query: InferRequestType<
        (typeof api.billing.usage)[":meterId"]["$get"]
      >["query"],
    ) =>
      queryOptions({
        queryKey: [KEY, "usage", meterId, query],
        queryFn: () =>
          handle(api.billing.usage[":meterId"].$get)({
            param: {
              meterId,
            },
            query,
          }),
      }),
  },
};

const mutations = {
  portal: mutationOptions({
    mutationKey: [KEY, "portal"],
    mutationFn: (data: InferRequestType<typeof api.billing.portal.$get>) =>
      handle(api.billing.portal.$get)(data),
  }),
};

export const billing = {
  queries,
  mutations,
};
