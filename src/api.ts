import type {
  TranscriptHistoryItem,
  TranscriptHistorySummary,
  TranscribeResponse,
  TranscriptionProvider
} from "./types";

export async function requestTranscript(input: {
  url: string;
  provider: TranscriptionProvider;
  language?: string;
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
