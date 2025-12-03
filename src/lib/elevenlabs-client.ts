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
