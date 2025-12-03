"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(() => {
    return searchParams.get("view") === "signup";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseClient());

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data?.session) {
          router.push("/onboarding");
          router.refresh();
        } else {
          router.push("/verify-email");
        }
      } else {
        const {
          data: { user },
          error,
        } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("onboarding_completed")
            .eq("user_id", user.id)
            .single();

          if (profile?.onboarding_completed) {
            router.push("/feed");
          } else {
            router.push("/onboarding");
          }
        } else {
          router.push("/onboarding");
        }
        router.refresh();
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Authentication failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-card rounded-xl shadow-2xl shadow-primary/5 overflow-hidden p-8 space-y-8 border border-border/50"
    >
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-foreground font-heading">
          VoiceDate
        </h1>
        <p className="text-muted-foreground">
          {isSignUp ? "Create your account" : "Welcome back"}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-md border-input bg-secondary/30 focus:bg-background transition-colors py-6"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-md border-input bg-secondary/30 focus:bg-background transition-colors py-6"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full py-6 text-lg rounded-md bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isSignUp ? (
            "Sign Up"
          ) : (
            "Log In"
          )}
        </Button>
      </form>

      <div className="text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {isSignUp
            ? "Already have an account? Log in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
       {/* Background Gradient/Glow */}
       <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
       <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#1763FC]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
