import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { elevenFetch } from "@/lib/elevenlabs-client";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

/**
 * POST /api/onboarding/analyze
 * Analyzes the onboarding conversation to generate profile prompts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, userInfo } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversation ID" },
        { status: 400 }
      );
    }

    // 1. Fetch transcript from ElevenLabs
    let transcriptText = "";

    try {
      const transcriptRes = await elevenFetch(
        `/v1/convai/conversations/${conversationId}`
      );
      const transcriptData = await transcriptRes.json();

      if (
        transcriptData.transcript &&
        Array.isArray(transcriptData.transcript)
      ) {
        // Map the transcript items to a readable string
        transcriptText = transcriptData.transcript
          .map(
            (t: { role: string; message: string }) =>
              `${t.role.toUpperCase()}: ${t.message}`
          )
          .join("\n");
      } else {
        console.warn("No transcript found in response", transcriptData);
        // We'll allow continuing even without transcript to not block the user,
        // but the AI analysis will be limited.
        transcriptText = "No transcript available.";
      }
    } catch (e) {
      console.error("Could not fetch transcript:", e);
      // Fallback text
      transcriptText = "Failed to retrieve transcript.";
    }

    // 2. Analyze with Vercel AI SDK (Anthropic)
    const { name, age, gender, lookingFor } = userInfo || {};

    // Schema for the output
    const schema = z.object({
      user_profile_prompt: z
        .string()
        .describe(
          "A detailed summary of the user's personality, background, and dating profile based on the conversation."
        ),
      user_preferences_prompt: z
        .string()
        .describe(
          "A detailed summary of what the user is looking for in a partner."
        ),
      user_important_notes: z
        .string()
        .describe(
          "Any specific dealbreakers, important life details, or other notes mentioned."
        ),
    });

    const systemPrompt = `
      You are an expert dating profile consultant. 
      Your task is to analyze a transcript of an onboarding interview for a voice-first dating app.
      
      User Basic Info:
      - Name: ${name}
      - Age: ${age}
      - Gender: ${gender}
      - Looking For: ${lookingFor}
      
      Extract the relevant information to create three specific prompts that will be used to instruct an AI agent representing this user.
      
      1. user_profile_prompt: Describe the user's personality, hobbies, vibe, and how they speak. This helps the agent act like them.
      2. user_preferences_prompt: Describe exactly who they want to meet.
      3. user_important_notes: Capture any dealbreakers or specific constraints.
      
      If the transcript is short or missing details, infer reasonable defaults based on the basic info, but keep it brief.
    `;

    try {
      const { object } = await generateObject({
        model: anthropic("claude-sonnet-4-5"),
        schema: schema,
        system: systemPrompt,
        prompt: `Here is the interview transcript:\n\n${transcriptText}`,
      });

      console.log("AI Analysis result:", object);

      // 3. Update User Profile in Supabase
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const {
          data: { user },
        } = await supabaseAdmin.auth.getUser(token);

        if (user) {
          // Use update instead of upsert to preserve existing basic info
          const { error: updateError } = await supabaseAdmin
            .from("user_profiles")
            .update({
              user_profile_prompt: object.user_profile_prompt,
              user_preferences_prompt: object.user_preferences_prompt,
              user_important_notes: object.user_important_notes,
              onboarding_completed: true,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

          if (updateError) {
            console.error("Failed to update profile prompts:", updateError);
            throw updateError;
          }
        }
      }

      return NextResponse.json({
        success: true,
        ...object,
      });
    } catch (aiError) {
      console.error("AI Analysis failed:", aiError);
      return NextResponse.json(
        { error: "Failed to analyze conversation" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Analysis route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
