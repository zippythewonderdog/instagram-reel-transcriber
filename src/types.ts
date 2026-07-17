export type TranscriptionProvider = "local-whisper" | "openai" | "lm-studio-compatible" | `local-llm:${string}`;
export type CleanupProvider = "none" | "lm-studio";

export interface LocalLlmConfig {
  id: string;
  name: string;
  kind: "lm-studio";
  baseUrl: string;
  model: string;
}

export interface LocalLlmInput {
  name: string;
  kind: "lm-studio";
  baseUrl: string;
  model: string;
}

export interface LocalLlmTestResult {
  ok: boolean;
  message: string;
  details?: string;
}

export interface TranscribeResponse {
  markdown: string;
  rawTranscript: string;
  metadata: {
    sourceUrl: string;
    provider: string;
    language: string;
    generatedAt: string;
    title?: string;
    durationSeconds?: number;
  };
  providerUsed: string;
  historyId?: string;
}

export interface TranscriptHistoryItem extends TranscribeResponse {
  id: string;
  createdAt: string;
}

export interface TranscriptHistorySummary {
  id: string;
  sourceUrl: string;
  title?: string;
  providerUsed: string;
  language: string;
  createdAt: string;
}

export interface ApiError {
  error?: {
    message?: string;
    code?: string;
    details?: string;
  };
}
