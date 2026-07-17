import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { AppError, type TranscriptResult, type TranscriptionProvider } from "../types";
import { runCommand } from "./commands";
import { normalizeTranscript } from "./markdown";

export async function transcribeAudio(
  provider: TranscriptionProvider,
  audioPath: string,
  jobDir: string,
  language?: string
): Promise<{ result: TranscriptResult; providerUsed: string }> {
  if (provider === "local-whisper") {
    return {
      result: await transcribeWithLocalWhisper(audioPath, jobDir, language),
      providerUsed: "local-whisper"
    };
  }

  if (provider === "openai") {
    return {
      result: await transcribeWithOpenAI(audioPath, language),
      providerUsed: `openai:${process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe"}`
    };
  }

  throw new AppError("Unknown transcription provider.", 400, "UNKNOWN_PROVIDER");
}

async function transcribeWithLocalWhisper(
  audioPath: string,
  jobDir: string,
  language?: string
): Promise<TranscriptResult> {
  const model = process.env.WHISPER_MODEL || "tiny";
  const modelDir = process.env.WHISPER_MODEL_DIR || path.join(process.cwd(), ".cache", "whisper");
  await mkdir(modelDir, { recursive: true });

  const args = [
    audioPath,
    "--model",
    model,
    "--model_dir",
    modelDir,
    "--task",
    "transcribe",
    "--output_dir",
    jobDir,
    "--output_format",
    "json",
    "--verbose",
    "False"
  ];

  if (language) {
    args.push("--language", language);
  }

  await runCommand("whisper", args, { timeoutMs: 30 * 60 * 1000 });
  const parsed = JSON.parse(await readFile(path.join(jobDir, `${path.basename(audioPath, path.extname(audioPath))}.json`), "utf8")) as {
    text?: string;
    language?: string;
  };

  return {
    text: normalizeTranscript(parsed.text ?? ""),
    language: parsed.language
  };
}

async function transcribeWithOpenAI(audioPath: string, language?: string): Promise<TranscriptResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError("OPENAI_API_KEY is required for OpenAI transcription.", 400, "OPENAI_KEY_MISSING");
  }

  const model = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe";
  const form = await createAudioForm(audioPath, model, language);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form,
    signal: AbortSignal.timeout(10 * 60_000)
  });

  if (!response.ok) {
    throw new AppError(
      "OpenAI transcription failed.",
      response.status,
      "OPENAI_TRANSCRIPTION_FAILED",
      await response.text()
    );
  }

  const data = (await response.json()) as { text?: string; language?: string };
  return {
    text: normalizeTranscript(data.text ?? ""),
    language: data.language
  };
}

async function createAudioForm(audioPath: string, model: string, language?: string): Promise<FormData> {
  const form = new FormData();
  const file = await readFile(audioPath);
  form.append("file", new Blob([file], { type: "audio/wav" }), path.basename(audioPath));
  form.append("model", model);
  form.append("response_format", "json");

  if (language) {
    form.append("language", language);
  }

  return form;
}
