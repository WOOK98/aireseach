import { queryOptions } from "@tanstack/react-query";

import { handle } from "@workspace/api/utils";

import { api } from "~/lib/api";

const KEY = "billing";

const queries = {
  summary: {
    get: (referenceId: string) =>
      queryOptions({
        queryKey: [KEY, "summary", referenceId],
        queryFn: () =>
          handle(api.billing.summary.$get)({
            query: {
              referenceId,
            },
          }),
      }),
  },
};

export const billing = {
  queries,
} as const;
