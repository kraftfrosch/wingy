import { OnboardingProvider } from "./onboarding-context";
import { StepIndicator } from "./step-indicator";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div 
      className="min-h-screen text-slate-900 font-sans"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <OnboardingProvider>
        <div className="max-w-md mx-auto min-h-screen flex flex-col relative overflow-hidden bg-white/95 backdrop-blur-sm shadow-2xl sm:rounded-3xl sm:my-8 sm:min-h-[800px]">

          <div className="relative z-10">
            <StepIndicator />
          </div>
          <main className="flex-1 flex flex-col relative z-10">{children}</main>
        </div>
      </OnboardingProvider>
    </div>
  );
}
