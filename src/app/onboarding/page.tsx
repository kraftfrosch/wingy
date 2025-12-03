"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "./onboarding-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronRight, Loader2 } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase-client";
import { toast } from "sonner";

export default function BasicInfoPage() {
  const { data, updateData, nextStep, currentStep, setCurrentStep } =
    useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const [supabase] = useState(() => createSupabaseClient());

  // Calculate step index (0-based) from global step (1-based)
  // Ensure we don't go out of bounds if state persists
  const stepIndex = Math.min(Math.max(currentStep - 1, 0), 2);

  useEffect(() => {
    if (currentStep > 3) {
      setCurrentStep(3);
    }
  }, [currentStep, setCurrentStep]);

  // Form states
  const [name, setName] = useState(data.displayName);
  const [age, setAge] = useState(data.age);
  const [gender, setGender] = useState(data.gender);
  const [lookingFor, setLookingFor] = useState(data.lookingFor);

  const handleNext = async () => {
    updateData({ displayName: name, age, gender, lookingFor });

    // Check if current step is valid
    if (stepIndex === 0 && (!name || !age)) return;
    if (stepIndex === 1 && !gender) return;
    if (stepIndex === 2 && !lookingFor) return;

    if (stepIndex < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      console.log("Submitting profile...", { name, age, gender, lookingFor });
      // Create profile before moving to conversation
      setIsLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        console.log("Session found:", !!session);

        if (!session) {
          toast.error("You must be logged in to continue");
          return;
        }

        const response = await fetch("/api/profile/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            displayName: name,
            age,
            gender,
            lookingFor,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create profile");
        }

        setCurrentStep(4);
        nextStep("/onboarding/conversation");
      } catch (error) {
        console.error("Profile creation error:", error);
        toast.error("Failed to save profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const steps = [
    // Step 0: Name & Age
    <div key="step0" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          First things first.
        </h1>
        <p className="text-slate-500 text-lg">What should we call you?</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base">
            Display Name
          </Label>
          <Input
            id="name"
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg py-6 rounded-md border-slate-200 focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="age" className="text-base">
            Age
          </Label>
          <Input
            id="age"
            type="number"
            placeholder="24"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="text-lg py-6 rounded-md border-slate-200 focus:border-primary focus:ring-primary"
          />
        </div>
      </div>
    </div>,

    // Step 1: Gender
    <div key="step1" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          How do you identify?
        </h1>
        <p className="text-slate-500 text-lg">Helping us find your people.</p>
      </div>

      <RadioGroup
        value={gender}
        onValueChange={setGender}
        className="grid gap-4"
      >
        {["Man", "Woman", "Non-binary", "Other"].map((g) => (
          <Label
            key={g}
            className={`flex items-center justify-between px-6 py-4 rounded-md border-2 cursor-pointer transition-all ${
              gender === g
                ? "border-primary bg-primary/10 text-primary"
                : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <span className="text-lg font-medium">{g}</span>
            <RadioGroupItem value={g} className="sr-only" />
            {gender === g && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 bg-primary rounded-full"
              />
            )}
          </Label>
        ))}
      </RadioGroup>
    </div>,

    // Step 2: Looking For
    <div key="step2" className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Who are you into?
        </h1>
        <p className="text-slate-500 text-lg">We&apos;ll tailor your feed.</p>
      </div>

      <RadioGroup
        value={lookingFor}
        onValueChange={setLookingFor}
        className="grid gap-4"
      >
        {["Men", "Women", "Everyone"].map((g) => (
          <Label
            key={g}
            className={`flex items-center justify-between px-6 py-4 rounded-md border-2 cursor-pointer transition-all ${
              lookingFor === g
                ? "border-primary bg-primary/10 text-primary"
                : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <span className="text-lg font-medium">{g}</span>
            <RadioGroupItem value={g} className="sr-only" />
            {lookingFor === g && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 bg-primary rounded-full"
              />
            )}
          </Label>
        ))}
      </RadioGroup>
    </div>,
  ];

  return (
    <div className="flex-1 flex flex-col p-8">
      <div className="flex-1 flex flex-col justify-start pt-4">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {steps[stepIndex]}
        </motion.div>
      </div>

      <div className="pt-8">
        <Button
          onClick={handleNext}
          disabled={
            isLoading ||
            (stepIndex === 0 && (!name || !age)) ||
            (stepIndex === 1 && !gender) ||
            (stepIndex === 2 && !lookingFor)
          }
          className="w-full py-7 text-lg rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : stepIndex === 2 ? (
            <>
              Let&apos;s Talk
              <ChevronRight className="ml-2 w-5 h-5" />
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="ml-2 w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
