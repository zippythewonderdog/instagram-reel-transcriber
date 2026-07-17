import type {
  CleanupProvider,
  LocalLlmConfig,
  LocalLlmInput,
  LocalLlmTestResult,
  TranscriptHistoryItem,
  TranscriptHistorySummary,
  TranscribeResponse,
  TranscriptionProvider
} from "./types";

export async function requestTranscript(input: {
  url: string;
  provider: TranscriptionProvider;
  language?: string;
  cleanupProvider: CleanupProvider;
}): Promise<TranscribeResponse> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Transcription failed.");
  }

  return data as TranscribeResponse;
}

export async function listLocalLlms(): Promise<LocalLlmConfig[]> {
  const response = await fetch("/api/local-llms");
  const data = await readJson(response);
  return data.llms as LocalLlmConfig[];
}

export async function createLocalLlm(input: LocalLlmInput): Promise<LocalLlmConfig> {
  const response = await fetch("/api/local-llms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const data = await readJson(response);
  return data.llm as LocalLlmConfig;
}

export async function deleteLocalLlm(id: string): Promise<void> {
  const response = await fetch(`/api/local-llms/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    await readJson(response);
  }
}

export async function testLocalLlm(input: LocalLlmInput): Promise<LocalLlmTestResult> {
  const response = await fetch("/api/local-llms/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return (await readJson(response)) as LocalLlmTestResult;
}

export async function testSavedLocalLlm(id: string): Promise<LocalLlmTestResult> {
  const response = await fetch(`/api/local-llms/${id}/test`, {
    method: "POST"
  });
  return (await readJson(response)) as LocalLlmTestResult;
}

export async function listTranscriptHistory(): Promise<TranscriptHistorySummary[]> {
  const response = await fetch("/api/history");
  const data = await readJson(response);
  return data.items as TranscriptHistorySummary[];
}

export async function getTranscriptHistoryItem(id: string): Promise<TranscriptHistoryItem> {
  const response = await fetch(`/api/history/${id}`);
  const data = await readJson(response);
  return data.item as TranscriptHistoryItem;
}

export async function deleteTranscriptHistoryItem(id: string): Promise<void> {
  const response = await fetch(`/api/history/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    await readJson(response);
  }
}

async function readJson(response: Response): Promise<any> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message || "Request failed.");
  }

  return data;
}
