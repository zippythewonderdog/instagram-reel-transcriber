export type BuiltInTranscriptionProvider = "local-whisper" | "openai";
export type TranscriptionProvider = BuiltInTranscriptionProvider | "lm-studio-compatible" | `local-llm:${string}`;
export type CleanupProvider = "none" | "lm-studio";

export interface TranscribeRequest {
  url: string;
  provider: TranscriptionProvider;
  localLlmId?: string;
  language?: string;
  cleanupProvider?: CleanupProvider;
}

export type LocalLlmKind = "lm-studio";

export interface LocalLlmConfig {
  id: string;
  name: string;
  kind: LocalLlmKind;
  baseUrl: string;
  model: string;
}

export interface CreateLocalLlmRequest {
  name: string;
  kind: LocalLlmKind;
  baseUrl: string;
  model: string;
}

export interface LocalLlmTestResult {
  ok: boolean;
  message: string;
  details?: string;
}

export interface TranscriptMetadata {
  sourceUrl: string;
  provider: string;
  language: string;
  generatedAt: string;
  title?: string;
  durationSeconds?: number;
}

export interface TranscribeResponse {
  markdown: string;
  rawTranscript: string;
  metadata: TranscriptMetadata;
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

export interface ExtractedMedia {
  audioPath: string;
  normalizedAudioPath: string;
  title?: string;
  durationSeconds?: number;
}

export interface TranscriptResult {
  text: string;
  language?: string;
}

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: string;

  constructor(message: string, statusCode = 500, code = "APP_ERROR", details?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
