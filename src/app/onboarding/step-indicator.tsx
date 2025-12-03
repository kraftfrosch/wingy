"use client";

import { useOnboarding } from "./onboarding-context";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function StepIndicator() {
  const { currentStep, totalSteps } = useOnboarding();
  const router = useRouter();
  const supabase = createSupabaseClient();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/login");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Error signing out");
    }
  };

  return (
    <div className="flex items-center gap-4 px-8 pt-8 w-full">
      <div className="flex gap-2 flex-1">
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
      <button
        onClick={handleSignOut}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
        title="Sign out"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
}
