"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface OnboardingData {
  displayName: string;
  age: string;
  gender: string;
  lookingFor: string;
  transcript?: string; // To store the conversation result
}

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  nextStep: (path: string) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
}

const defaultData: OnboardingData = {
  displayName: "",
  age: "",
  gender: "",
  lookingFor: "",
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const router = useRouter();

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = (path: string) => {
    router.push(path);
  };

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateData,
        nextStep,
        currentStep,
        setCurrentStep,
        totalSteps,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
