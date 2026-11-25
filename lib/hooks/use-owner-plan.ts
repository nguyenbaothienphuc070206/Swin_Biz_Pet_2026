"use client";

import { useState, useEffect, useCallback } from "react";

export type OwnerPlan = "free" | "premium";

export function useOwnerPlan() {
  const [plan, setPlanState] = useState<OwnerPlan>("free");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored =
        localStorage.getItem("pawcare_subscription_plan") ||
        localStorage.getItem("pawcare_plan");
      if (stored === "premium") {
        setPlanState("premium");
      } else {
        setPlanState("free");
      }
      setIsLoaded(true);
    }
  }, []);

  const setPlan = useCallback((newPlan: OwnerPlan) => {
    setPlanState(newPlan);
    if (typeof window !== "undefined") {
      localStorage.setItem("pawcare_subscription_plan", newPlan);
      localStorage.setItem("pawcare_plan", newPlan);
      window.dispatchEvent(new Event("pawcare_plan_changed"));
    }
  }, []);

  useEffect(() => {
    const handlePlanChange = () => {
      const stored =
        localStorage.getItem("pawcare_subscription_plan") ||
        localStorage.getItem("pawcare_plan");
      setPlanState(stored === "premium" ? "premium" : "free");
    };
    window.addEventListener("pawcare_plan_changed", handlePlanChange);
    return () => window.removeEventListener("pawcare_plan_changed", handlePlanChange);
  }, []);

  return {
    plan,
    isPremium: plan === "premium",
    isFree: plan === "free",
    setPlan,
    isLoaded,
  };
}
