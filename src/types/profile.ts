/**
 * User Profile Type Definitions
 * Matches the database schema for user_profiles table
 */

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  age: number;
  gender: string;
  location_city?: string | null;
  location_region?: string | null;
  bio?: string | null;
  profile_photo_url?: string | null;

  // Onboarding conversation data
  onboarding_preferences?: OnboardingPreferences | null;
  onboarding_questions?: OnboardingQuestions | null;
  onboarding_strengths?: OnboardingStrengths | null;
  onboarding_summary?: string | null;
  onboarding_tags?: string[] | null;

  // Voice and agent IDs from ElevenLabs
  cloned_voice_id?: string | null;
  cloned_agent_id?: string | null;

  // Agent prompt fields
  user_profile_prompt?: string | null;
  user_preferences_prompt?: string | null;
  user_important_notes?: string | null;

  // Voice cloning consent
  voice_cloning_consent: boolean;
  voice_cloning_consent_at?: string | null;

  // Status tracking
  onboarding_completed: boolean;
  agent_ready: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface OnboardingPreferences {
  // What they're looking for in a partner
  partner_gender?: string | string[];
  partner_age_range?: {
    min?: number;
    max?: number;
  };
  values?: string[];
  dealbreakers?: string[];
  [key: string]: unknown;
}

export interface OnboardingQuestions {
  // What they want to know about others
  questions?: string[];
  topics?: string[];
  [key: string]: unknown;
}

export interface OnboardingStrengths {
  // What they offer as a partner
  strengths?: string[];
  interests?: string[];
  lifestyle?: string[];
  [key: string]: unknown;
}

export type CreateProfileInput = Omit<
  UserProfile,
  'id' | 'user_id' | 'created_at' | 'updated_at' | 'cloned_voice_id' | 'cloned_agent_id' | 'voice_cloning_consent' | 'voice_cloning_consent_at' | 'onboarding_completed' | 'agent_ready'
>;

export type UpdateProfileInput = Partial<
  Omit<
    UserProfile,
    'id' | 'user_id' | 'created_at' | 'updated_at'
  >
>;

export interface UserLike {
  id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
}

export interface MatchWithProfile {
  user_id: string;
  matched_with_user_id: string;
  matched_at: string;
  profile: UserProfile;
}
