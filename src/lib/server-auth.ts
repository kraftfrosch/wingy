import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function checkOnboardingStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("onboarding_completed, agent_ready, cloned_voice_id, display_name")
    .eq("user_id", user.id)
    .single();

  // Determine onboarding stage
  // Stage 0: No profile at all
  // Stage 1: Has basic profile but no voice/agent
  // Stage 2: Has voice but no agent
  // Stage 3: Complete (agent_ready or onboarding_completed)
  
  let onboardingStage = 0;
  if (profile) {
    if (profile.onboarding_completed || profile.agent_ready) {
      onboardingStage = 3; // Complete
    } else if (profile.cloned_voice_id) {
      onboardingStage = 2; // Has voice, needs agent
    } else if (profile.display_name) {
      onboardingStage = 1; // Has basic info, needs conversation
    }
  }

  return {
    user,
    profile,
    onboardingCompleted: profile?.onboarding_completed ?? false,
    onboardingStage,
  };
}

export async function ensureOnboardingComplete() {
  const status = await checkOnboardingStatus();
  
  if (!status?.user) {
    redirect("/login");
  }

  // Redirect based on onboarding stage
  if (status.onboardingStage === 0) {
    // No profile - start from beginning
    redirect("/onboarding");
  } else if (status.onboardingStage === 1 || status.onboardingStage === 2) {
    // Has profile but incomplete - go to conversation
    redirect("/onboarding/conversation");
  }
  // Stage 3 = complete, continue to feed

  return status.user;
}

/**
 * For onboarding pages - ensures user is logged in
 * Returns the user and their onboarding stage
 */
export async function getOnboardingStatus() {
  const status = await checkOnboardingStatus();
  
  if (!status?.user) {
    redirect("/login");
  }

  return status;
}

