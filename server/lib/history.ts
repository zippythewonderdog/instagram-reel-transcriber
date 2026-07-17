import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { AppError, type TranscriptHistoryItem, type TranscriptHistorySummary, type TranscribeResponse } from "../types";

const DATA_DIR = path.join(process.cwd(), "data");

interface HistoryStore {
  items: TranscriptHistoryItem[];
}

function getStorePath() {
  return process.env.TRANSCRIPT_HISTORY_STORE_PATH || path.join(DATA_DIR, "transcript-history.json");
}

export async function listTranscriptHistory(): Promise<TranscriptHistorySummary[]> {
  const store = await readStore();
  return store.items.map((item) => ({
    id: item.id,
    sourceUrl: item.metadata.sourceUrl,
    title: item.metadata.title,
    providerUsed: item.providerUsed,
    language: item.metadata.language,
    createdAt: item.createdAt
  }));
}

export async function getTranscriptHistoryItem(id: string): Promise<TranscriptHistoryItem> {
  const item = (await readStore()).items.find((candidate) => candidate.id === id);

  if (!item) {
    throw new AppError("Transcript history item not found.", 404, "TRANSCRIPT_HISTORY_NOT_FOUND");
  }

  return item;
}

export async function saveTranscriptHistory(response: TranscribeResponse): Promise<TranscriptHistoryItem> {
  const store = await readStore();
  const createdAt = new Date().toISOString();
  const item: TranscriptHistoryItem = {
    ...response,
    id: randomUUID(),
    historyId: undefined,
    createdAt
  };

  store.items = [item, ...store.items].slice(0, 100);
  await writeStore(store);
  return item;
}

export async function deleteTranscriptHistoryItem(id: string): Promise<void> {
  const store = await readStore();
  const nextItems = store.items.filter((item) => item.id !== id);

  if (nextItems.length === store.items.length) {
    throw new AppError("Transcript history item not found.", 404, "TRANSCRIPT_HISTORY_NOT_FOUND");
  }

  await writeStore({ items: nextItems });
}

async function readStore(): Promise<HistoryStore> {
  try {
    const text = await readFile(getStorePath(), "utf8");
    const parsed = JSON.parse(text) as HistoryStore;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : []
    };
  } catch {
    return { items: [] };
  }
}

async function writeStore(store: HistoryStore): Promise<void> {
  const storePath = getStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}
