import { checkOnboardingStatus } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";

export default async function Home() {
  const status = await checkOnboardingStatus();

  if (status?.user) {
    if (status.onboardingCompleted) {
      redirect("/feed");
    } else {
      redirect("/onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gradient/Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#1763FC]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] bg-[#17FCB0]/10 rounded-full blur-[100px] pointer-events-none" />

      <main className="relative z-10 max-w-lg text-center space-y-8">
        {/* Glass Icon Container */}
        <div className="mx-auto w-28 h-28 rounded-2xl flex items-center justify-center glass mb-8 shadow-xl shadow-primary/5">
          <Mic className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-6xl font-bold tracking-tight text-foreground font-heading">
          Ember
        </h1>

        <p className="text-xl text-muted-foreground leading-relaxed max-w-md mx-auto">
          Dating feels better when you can hear it. <br />
          Skip the small talk and connect with your voice.
        </p>

        <div className="pt-8 space-y-4 flex flex-col items-center">
          <Link
            href="/login?view=signup"
            className="w-full max-w-xs bg-primary text-primary-foreground py-4 px-8 rounded-md font-bold text-lg hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>

          <div className="flex justify-center w-full">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors py-2"
            >
              Already have an account? Log in
            </Link>
          </div>

          <p className="text-sm text-muted-foreground/60 mt-8">
            Available on iOS and Android soon.
          </p>
        </div>
      </main>
    </div>
  );
}
