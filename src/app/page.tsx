import { checkOnboardingStatus } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";

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
    <div 
      className="min-h-screen text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <main className="relative z-10 max-w-lg text-center space-y-8">
        {/* Logo */}
        <div className="mx-auto mb-8">
          <Logo width={320} height={100} className="mx-auto" />
        </div>

        <p className="text-xl text-white/90 leading-relaxed max-w-md mx-auto font-medium">
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
              className="text-white/80 hover:text-white text-sm font-medium transition-colors py-2"
            >
              Already have an account? Log in
            </Link>
          </div>

          <p className="text-sm text-white/60 mt-8">
            Available on iOS and Android soon.
          </p>
        </div>
      </main>
    </div>
  );
}
