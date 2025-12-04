import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateMusic, generateMusicPrompt } from "@/lib/elevenlabs-client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Check if music already exists
    if (profile.background_music_url) {
      return NextResponse.json({
        music_url: profile.background_music_url,
        cached: true,
      });
    }

    // Generate music prompt based on personality
    const musicPrompt = generateMusicPrompt({
      display_name: profile.display_name,
      user_profile_prompt: profile.user_profile_prompt,
      onboarding_summary: profile.onboarding_summary,
      onboarding_tags: profile.onboarding_tags,
    });

    console.log(`Generating music for ${profile.display_name}: "${musicPrompt}"`);

    // Generate music
    const musicBuffer = await generateMusic({
      prompt: musicPrompt,
      duration_seconds: 120, // 2 minutes, will loop
    });

    // Upload to Supabase Storage
    const fileName = `${userId}/background-music.mp3`;
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from("user-music")
      .upload(fileName, musicBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading music:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload music" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("user-music")
      .getPublicUrl(fileName);

    const musicUrl = urlData.publicUrl;

    // Update profile with music URL
    await supabaseAdmin
      .from("user_profiles")
      .update({ background_music_url: musicUrl })
      .eq("user_id", userId);

    console.log(`Music generated and saved for ${profile.display_name}: ${musicUrl}`);

    return NextResponse.json({
      music_url: musicUrl,
      cached: false,
    });
  } catch (error) {
    console.error("Music generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate music" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing music URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("background_music_url")
      .eq("user_id", userId)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      music_url: profile.background_music_url,
    });
  } catch (error) {
    console.error("Error fetching music:", error);
    return NextResponse.json(
      { error: "Failed to fetch music" },
      { status: 500 }
    );
  }
}

