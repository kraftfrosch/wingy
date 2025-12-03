"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConversation } from "@elevenlabs/react";
import { useOnboarding } from "../onboarding-context";
import { Button } from "@/components/ui/button";
import { Mic, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseClient } from "@/lib/supabase-client";

export default function ConversationPage() {
  const { data, updateData, nextStep, setCurrentStep } = useOnboarding();
  const [hasStarted, setHasStarted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const supabase = createSupabaseClient();

  useEffect(() => {
    setCurrentStep(4);
  }, [setCurrentStep]);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasAgentStartedSpeakingRef = useRef(false);

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

  // Toggle recording based on agent speaking state
  useEffect(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (isSpeaking) {
      hasAgentStartedSpeakingRef.current = true;
      if (recorder.state === "recording") {
        console.log("Agent speaking, pausing user recording...");
        recorder.pause();
      }
    } else {
      // Agent is NOT speaking
      if (hasAgentStartedSpeakingRef.current) {
        // Agent has spoken at least once, so it's safe to record user
        if (recorder.state === "inactive") {
          console.log("Agent finished first turn, starting recording...");
          recorder.start(1000);
        } else if (recorder.state === "paused") {
          console.log("Agent stopped speaking, resuming user recording...");
          recorder.resume();
        }
      }
    }
  }, [isSpeaking]);

  const setupRecorder = (stream: MediaStream) => {
    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`Captured audio chunk: ${event.data.size} bytes`);
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log(
          "MediaRecorder stopped. Total chunks:",
          audioChunksRef.current.length
        );
      };

      console.log("Recorder setup complete, waiting for agent to speak...");
    } catch (error) {
      console.error("Failed to setup media recorder:", error);
    }
  };

  const startConversation = useCallback(async () => {
    try {
      // Request mic permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const agentId = process.env.NEXT_PUBLIC_ONBOARDING_AGENT_ID;
      if (!agentId) {
        toast.error("Configuration error: Onboarding Agent ID missing");
        return;
      }

      // Setup recorder but don't start it yet
      setupRecorder(stream);

      const id = await conversation.startSession({
        agentId,
        connectionType: "webrtc",
      });
      setConversationId(id);
      setHasStarted(true);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Could not access microphone");
    }
  }, [conversation]);

  const uploadVoiceSample = async (): Promise<boolean> => {
    console.log("Preparing to upload voice sample...");
    console.log("Audio chunks recorded:", audioChunksRef.current.length);

    if (!audioChunksRef.current.length) {
      console.warn("No audio recorded for cloning");
      return false;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    console.log("Created audio blob:", audioBlob.size, "bytes", audioBlob.type);

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("name", `${data.displayName || "User"}'s Voice`);
    formData.append("description", "Recorded during onboarding interview");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("No session found for upload");
        return false;
      }

      console.log("Sending request to /api/voice/clone...");
      const response = await fetch("/api/voice/clone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Voice cloning failed:", error);
        return false;
      }

      const result = await response.json();
      console.log("Voice cloned successfully:", result.voice_id);
      return true;
    } catch (error) {
      console.error("Error uploading voice sample:", error);
      return false;
    }
  };

  const stopRecording = (): Promise<void> => {
    return new Promise((resolve) => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.onstop = () => {
          console.log("Recorder stopped via promise wrapper");
          resolve();
        };
        // Ensure we are not paused before stopping
        if (mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.resume();
        }
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      } else {
        resolve();
      }
    });
  };

  const endConversation = async () => {
    if (!conversationId) {
      console.error("No conversation ID found");
      toast.error("Could not retrieve conversation details. Please try again.");
      return;
    }

    setIsAnalyzing(true);

    // 1. Stop recording and wait for it to finish processing
    await stopRecording();

    // 2. Stop ElevenLabs conversation
    await conversation.endSession();

    // 3. Upload voice sample
    toast.info("Creating your voice clone...");
    await uploadVoiceSample();

    // 4. Analyze conversation
    await handleAnalysis(conversationId);
  };

  const handleAnalysis = async (id: string) => {
    try {
      // Short delay to allow backend to index/process the audio/transcript
      await new Promise((resolve) => setTimeout(resolve, 2000));

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

      updateData({
        ...data,
        ...result,
      });

      nextStep("/feed");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to process conversation. Please try again.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-8 text-center">
      <div className="flex-1 flex flex-col items-center justify-start pt-4 space-y-8 w-full">
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
