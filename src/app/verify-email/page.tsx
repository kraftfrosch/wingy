"use client";

import { motion } from "framer-motion";
import { Mail, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
       {/* Background Gradient/Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#1763FC]/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card rounded-[2rem] shadow-xl shadow-primary/5 overflow-hidden p-8 space-y-8 text-center border border-border/50"
      >
        <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
          <Mail className="w-10 h-10 text-primary" />
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground font-heading">
            Check your email
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            We've sent you a verification link. Please check your inbox to verify your account and get started with VoiceDate.
          </p>
        </div>

        <Link
          href="/login"
          className="block w-full bg-primary text-primary-foreground py-4 px-8 rounded-full font-bold text-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
        >
          Back to Login
          <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>
    </div>
  );
}

