import { OnboardingProvider } from "./onboarding-context";
import { StepIndicator } from "./step-indicator";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <OnboardingProvider>
        <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden bg-white shadow-2xl sm:rounded-3xl sm:my-8 sm:min-h-[800px]">
          {/* Decorative background blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[30%] bg-purple-200 rounded-full blur-3xl opacity-40 animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[30%] bg-pink-200 rounded-full blur-3xl opacity-40 animate-pulse" />

          <div className="relative z-10">
            <StepIndicator />
          </div>
          <main className="flex-1 flex flex-col relative z-10">{children}</main>
        </div>
      </OnboardingProvider>
    </div>
  );
}
