import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  deleteTranscriptHistoryItem,
  getTranscriptHistoryItem,
  listTranscriptHistory,
  saveTranscriptHistory
} from "../server/lib/history";

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "transcript-history-test-"));
  process.env.TRANSCRIPT_HISTORY_STORE_PATH = path.join(tempDir, "history.json");
});

afterEach(async () => {
  delete process.env.TRANSCRIPT_HISTORY_STORE_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

describe("transcript history", () => {
  it("saves, lists, loads, and deletes transcript history", async () => {
    const saved = await saveTranscriptHistory({
      markdown: "# Transcript",
      rawTranscript: "Hello",
      providerUsed: "local-whisper",
      metadata: {
        sourceUrl: "https://www.instagram.com/reel/ABC/",
        provider: "local-whisper",
        language: "en",
        generatedAt: "now",
        title: "Demo Reel"
      }
    });

    expect(await listTranscriptHistory()).toMatchObject([
      {
        id: saved.id,
        title: "Demo Reel",
        providerUsed: "local-whisper"
      }
    ]);
    await expect(getTranscriptHistoryItem(saved.id)).resolves.toMatchObject({
      rawTranscript: "Hello"
    });

    await deleteTranscriptHistoryItem(saved.id);
    expect(await listTranscriptHistory()).toEqual([]);
  });
});
