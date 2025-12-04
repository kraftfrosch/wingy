/**
 * ElevenLabs API Client
 * Handles all interactions with the ElevenLabs API
 */

const ELEVEN_API_BASE = "https://api.elevenlabs.io";

export interface CreateVoiceCloneInput {
  name: string;
  description?: string;
  files: File[];
}

export interface CreateVoiceCloneResponse {
  voice_id: string;
  name: string;
  samples?: unknown[];
  category?: string;
  fine_tuning?: {
    model_id?: string;
    is_allowed_to_fine_tune?: boolean;
    finetuning_state?: string;
    verification_failures?: string[];
    verification_attempts_count?: number;
    manual_verification_requested?: boolean;
  };
  labels?: Record<string, string>;
  description?: string;
  preview_url?: string;
  available_for_tiers?: string[];
  settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  sharing?: {
    status?: string;
    history_item_sample_id?: string;
    original_voice_id?: string;
    public_owner_id?: string;
    liked_by_count?: number;
    cloned_by_count?: number;
    name?: string;
    labels?: Record<string, string>;
    description?: string;
    created_at_unix?: number;
    rate?: number;
    free_users_allowed?: boolean;
    live_moderation_enabled?: boolean;
    permissions?: string[];
  };
  high_quality_base_model_ids?: string[];
  safety_control?: string;
  permission_on_resource?: string;
  voice_verification?: {
    requires_verification?: boolean;
    is_verified?: boolean;
    verification_failures?: string[];
    verification_attempts_count?: number;
    language?: string;
  };
}

export interface CreateAgentInput {
  name: string;
  voiceId: string;
  prompt: string;
  firstMessage: string;
  language?: string;
}

export interface CreateAgentResponse {
  agent_id: string;
  name?: string;
  [key: string]: unknown;
}

export interface GenerateMusicInput {
  prompt: string;
  duration_seconds?: number; // 5-180 seconds
}

export interface GenerateMusicResponse {
  audio_url: string;
}

/**
 * Fetches from ElevenLabs API with authentication
 */
export async function elevenFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set");
  }

  const headers = {
    "xi-api-key": apiKey,
    ...(init.headers || {}),
  };

  const res = await fetch(`${ELEVEN_API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `ElevenLabs API error: ${res.status} ${res.statusText} - ${errorText}`
    );
  }

  return res;
}

/**
 * Creates a voice clone using Instant Voice Cloning
 */
export async function createVoiceClone(
  input: CreateVoiceCloneInput
): Promise<CreateVoiceCloneResponse> {
  const formData = new FormData();
  formData.append("name", input.name);

  if (input.description) {
    formData.append("description", input.description);
  }

  // Append all audio files
  input.files.forEach((file) => {
    formData.append("files", file);
  });

  const res = await elevenFetch("/v1/voices/add", {
    method: "POST",
    body: formData,
  });

  return res.json();
}

/**
 * Creates an agent using the Agents Platform
 */
export async function createAgent(
  input: CreateAgentInput
): Promise<CreateAgentResponse> {
  const body = {
    name: input.name,
    conversation_config: {
      agent: {
        prompt: {
          prompt: input.prompt,
        },
        first_message: input.firstMessage,
        language: input.language ?? "en",
      },
      tts: {
        voice_id: input.voiceId,
      },
    },
  };

  const res = await elevenFetch("/v1/convai/agents/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

/**
 * Generates background music based on a text prompt
 * Uses ElevenLabs Music Generation API
 */
export async function generateMusic(
  input: GenerateMusicInput
): Promise<Buffer> {
  const body = {
    prompt: input.prompt,
    duration_seconds: input.duration_seconds ?? 60,
    prompt_influence: 0.5,
  };

  const res = await elevenFetch("/v1/music", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Music API returns audio data directly
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generates a music prompt based on user personality
 */
export function generateMusicPrompt(profile: {
  display_name: string;
  user_profile_prompt?: string | null;
  onboarding_summary?: string | null;
  onboarding_tags?: string[] | null;
}): string {
  const tags = profile.onboarding_tags?.slice(0, 3).join(", ") || "";
  const summary = profile.onboarding_summary || profile.user_profile_prompt || "";
  
  // Create a mood-based prompt from the personality
  const summaryLower = summary.toLowerCase();
  
  let mood = "warm and inviting";
  let style = "acoustic lo-fi";
  
  if (summaryLower.includes("adventur") || summaryLower.includes("travel") || summaryLower.includes("outdoor")) {
    mood = "uplifting and adventurous";
    style = "indie folk";
  } else if (summaryLower.includes("creative") || summaryLower.includes("art") || summaryLower.includes("music")) {
    mood = "dreamy and creative";
    style = "ambient electronic";
  } else if (summaryLower.includes("fun") || summaryLower.includes("social") || summaryLower.includes("party")) {
    mood = "upbeat and cheerful";
    style = "tropical house";
  } else if (summaryLower.includes("calm") || summaryLower.includes("relax") || summaryLower.includes("peace")) {
    mood = "peaceful and serene";
    style = "ambient piano";
  } else if (summaryLower.includes("confiden") || summaryLower.includes("ambitio") || summaryLower.includes("driven")) {
    mood = "confident and smooth";
    style = "jazzy R&B";
  }
  
  return `Create ${mood} background music in a ${style} style. ${tags ? `Themes: ${tags}.` : ""} Instrumental only, suitable for a casual conversation. Loopable, no vocals.`;
}
