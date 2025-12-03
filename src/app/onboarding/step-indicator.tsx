"use client";

import { useOnboarding } from "./onboarding-context";
import { motion } from "framer-motion";

export function StepIndicator() {
  const { currentStep, totalSteps } = useOnboarding();

  return (
    <div className="flex gap-2 px-8 pt-8 w-full">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-slate-900"
            initial={{ width: "0%" }}
            animate={{ width: i + 1 <= currentStep ? "100%" : "0%" }}
            transition={{ duration: 0.3 }}
          />
        </div>
      ))}
    </div>
  );
}
