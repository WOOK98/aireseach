"use client";

import { useEffect, useState } from "react";

export type UserPlan = "free" | "pro" | "business";

export function useUserPlan() {
  const [plan, setPlan] = useState<UserPlan>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/report/plan")
      .then((r) => r.json() as Promise<{ plan?: string }>)
      .then((d) => {
        const p = d.plan;
        if (p === "pro" || p === "business") {
          setPlan(p);
        }
        return p;
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return { plan, loading, isPaid: plan !== "free" };
}
