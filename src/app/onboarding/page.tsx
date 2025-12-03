"use client";

import { useState } from "react";
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
  const { data, updateData, nextStep } = useOnboarding();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [supabase] = useState(() => createSupabaseClient());

  // Form states
  const [name, setName] = useState(data.displayName);
  const [age, setAge] = useState(data.age);
  const [gender, setGender] = useState(data.gender);
  const [lookingFor, setLookingFor] = useState(data.lookingFor);

  const handleNext = async () => {
    updateData({ displayName: name, age, gender, lookingFor });

    // Check if current step is valid
    if (step === 0 && (!name || !age)) return;
    if (step === 1 && !gender) return;
    if (step === 2 && !lookingFor) return;

    if (step < 2) {
      setStep(step + 1);
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
            className="text-lg py-6 rounded-2xl border-slate-200 focus:border-purple-500 focus:ring-purple-500"
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
            className="text-lg py-6 rounded-2xl border-slate-200 focus:border-purple-500 focus:ring-purple-500"
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
            className={`flex items-center justify-between px-6 py-4 rounded-2xl border-2 cursor-pointer transition-all ${
              gender === g
                ? "border-purple-600 bg-purple-50 text-purple-900"
                : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <span className="text-lg font-medium">{g}</span>
            <RadioGroupItem value={g} className="sr-only" />
            {gender === g && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 bg-purple-600 rounded-full"
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
            className={`flex items-center justify-between px-6 py-4 rounded-2xl border-2 cursor-pointer transition-all ${
              lookingFor === g
                ? "border-pink-500 bg-pink-50 text-pink-900"
                : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <span className="text-lg font-medium">{g}</span>
            <RadioGroupItem value={g} className="sr-only" />
            {lookingFor === g && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 bg-pink-500 rounded-full"
              />
            )}
          </Label>
        ))}
      </RadioGroup>
    </div>,
  ];

  return (
    <div className="flex-1 flex flex-col p-8">
      <div className="flex-1 flex flex-col justify-center">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {steps[step]}
        </motion.div>
      </div>

      <div className="pt-8">
        <Button
          onClick={handleNext}
          disabled={
            isLoading ||
            (step === 0 && (!name || !age)) ||
            (step === 1 && !gender) ||
            (step === 2 && !lookingFor)
          }
          className="w-full py-7 text-lg rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : step === 2 ? (
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
