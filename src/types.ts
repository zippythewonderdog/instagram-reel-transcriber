export type TranscriptionProvider = "local-whisper" | "openai";

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
