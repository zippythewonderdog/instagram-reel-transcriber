import express from "express";

import { AppError, type TranscribeRequest, type TranscribeResponse } from "./types";
import { validateInstagramUrl } from "./lib/instagram";
import { renderTranscriptMarkdown } from "./lib/markdown";
import { cleanupJobDir, createJobDir, extractInstagramAudio } from "./lib/media";
import { transcribeAudio } from "./lib/providers";
import {
  deleteTranscriptHistoryItem,
  getTranscriptHistoryItem,
  listTranscriptHistory,
  saveTranscriptHistory
} from "./lib/history";

const PROVIDERS = new Set(["local-whisper", "openai"]);

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/history", async (_req, res, next) => {
    try {
      res.json({ items: await listTranscriptHistory() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/history/:id", async (req, res, next) => {
    try {
      res.json({ item: await getTranscriptHistoryItem(req.params.id) });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/history/:id", async (req, res, next) => {
    try {
      await deleteTranscriptHistoryItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/transcribe", async (req, res, next) => {
    let jobDir: string | undefined;

    try {
      const body = req.body as Partial<TranscribeRequest>;
      const url = validateInstagramUrl(String(body.url ?? ""));
      const provider = body.provider || "local-whisper";

      if (!PROVIDERS.has(provider)) {
        throw new AppError("Unknown transcription provider.", 400, "UNKNOWN_PROVIDER");
      }

      jobDir = await createJobDir();
      const media = await extractInstagramAudio(url, jobDir);
      const transcript = await transcribeAudio(provider, media.normalizedAudioPath, jobDir, body.language);
      const cleanedText = transcript.result.text;
      const generatedAt = new Date().toLocaleString();
      const metadata = {
        sourceUrl: url,
        provider: transcript.providerUsed,
        language: body.language || transcript.result.language || "auto-detected",
        generatedAt,
        title: media.title,
        durationSeconds: media.durationSeconds
      };
      const markdown = renderTranscriptMarkdown(metadata, cleanedText);
      const response: TranscribeResponse = {
        markdown,
        rawTranscript: cleanedText,
        metadata,
        providerUsed: transcript.providerUsed
      };
      const historyItem = await saveTranscriptHistory(response);

      res.json({ ...response, historyId: historyItem.id });
    } catch (error) {
      next(error);
    } finally {
      if (jobDir) {
        await cleanupJobDir(jobDir);
      }
    }
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: {
          message: error.message,
          code: error.code,
          details: error.details
        }
      });
      return;
    }

    res.status(500).json({
      error: {
        message: "Something went wrong while transcribing the Reel.",
        code: "UNEXPECTED_ERROR",
        details: error instanceof Error ? error.message : undefined
      }
    });
  });

  return app;
}
