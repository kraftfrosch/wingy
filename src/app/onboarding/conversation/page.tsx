"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConversation } from "@elevenlabs/react";
import { useOnboarding } from "../onboarding-context";
import { Button } from "@/components/ui/button";
import { Mic, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseClient } from "@/lib/supabase-client";

export default function ConversationPage() {
  const { data, updateData, nextStep } = useOnboarding();
  const [hasStarted, setHasStarted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const supabase = createSupabaseClient();

  const conversation = useConversation({
    onConnect: () => console.log("Connected to onboarding agent"),
    onDisconnect: () => console.log("Disconnected from onboarding agent"),
    onError: (error) => {
      console.error("Conversation error:", error);
      toast.error("Connection error. Please try again.");
    },
    onModeChange: (mode) => console.log("Mode changed:", mode),
  });

  const { status, isSpeaking } = conversation;

  const startConversation = useCallback(async () => {
    try {
      // Request mic permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const agentId = process.env.NEXT_PUBLIC_ONBOARDING_AGENT_ID;
      if (!agentId) {
        toast.error("Configuration error: Onboarding Agent ID missing");
        return;
      }

      const id = await conversation.startSession({
        agentId,
        connectionType: "webrtc", // Explicitly set connection type
      });
      setConversationId(id);
      setHasStarted(true);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Could not access microphone");
    }
  }, [conversation]);

  const endConversation = async () => {
    // Capture the ID *before* ending the session, just in case the SDK clears it (though it usually persists)
    // But we rely on stored state `conversationId` now
    if (!conversationId) {
      console.error("No conversation ID found");
      toast.error("Could not retrieve conversation details. Please try again.");
      return;
    }

    await conversation.endSession();
    handleAnalysis(conversationId);
  };

  const handleAnalysis = async (id: string) => {
    setIsAnalyzing(true);
    try {
      // Short delay to allow backend to index/process the audio/transcript
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get current session for auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/onboarding/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversationId: id,
          userInfo: {
            name: data.displayName,
            age: data.age,
            gender: data.gender,
            lookingFor: data.lookingFor,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const result = await response.json();

      // Update context with the analyzed prompts
      updateData({
        ...data,
        ...result, // Should contain user_profile_prompt, etc.
      });

      // Move to completion/feed
      nextStep("/feed");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to process conversation. Please try again.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-8 text-center">
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h1 className="text-3xl font-bold text-slate-900">
            {hasStarted ? "Listening..." : "Let's get to know you"}
          </h1>
          <p className="text-slate-500 text-lg max-w-xs mx-auto">
            {hasStarted
              ? "Tell me about yourself, your hobbies, and what makes you tick."
              : "I'll ask a few questions to build your profile. Just be yourself!"}
          </p>
        </motion.div>

        {/* Visualizer Circle */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <AnimatePresence>
            {status === "connected" && (
              <>
                {/* Outer pulsing ring */}
                <motion.div
                  animate={{
                    scale: isSpeaking ? [1, 1.2, 1] : 1,
                    opacity: isSpeaking ? 0.5 : 0.2,
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-purple-400 rounded-full blur-xl"
                />
                {/* Inner active ring */}
                <motion.div
                  animate={{
                    scale: isSpeaking ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-4 bg-linear-to-tr from-purple-500 to-pink-500 rounded-full opacity-20"
                />
              </>
            )}
          </AnimatePresence>

          <div className="relative z-10 w-32 h-32 bg-white rounded-full shadow-xl flex items-center justify-center">
            {status === "connected" ? (
              <motion.div
                animate={{
                  height: isSpeaking ? [20, 50, 20] : 10,
                }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="flex gap-1 items-center"
              >
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: isSpeaking ? [15, 35, 15] : 8,
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.4,
                      delay: i * 0.1,
                    }}
                    className="w-2 bg-slate-900 rounded-full"
                  />
                ))}
              </motion.div>
            ) : (
              <Mic className="w-10 h-10 text-slate-300" />
            )}
          </div>
        </div>
      </div>

      <div className="w-full space-y-4">
        {!hasStarted ? (
          <Button
            onClick={startConversation}
            className="w-full py-7 text-lg rounded-2xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
          >
            Start Interview
          </Button>
        ) : (
          <Button
            onClick={endConversation}
            disabled={isAnalyzing}
            className="w-full py-7 text-lg rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-slate-200"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                Creating Profile...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <PhoneOff className="w-5 h-5" />
                Finish & Create Profile
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
