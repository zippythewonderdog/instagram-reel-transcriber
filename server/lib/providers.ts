import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { AppError, type TranscriptResult, type TranscriptionProvider } from "../types";
import { runCommand } from "./commands";
import { cleanupTranscriptWithLocalLlm, getLocalLlm } from "./localLlms";
import { normalizeTranscript } from "./markdown";

export async function transcribeAudio(
  provider: TranscriptionProvider,
  audioPath: string,
  jobDir: string,
  language?: string
): Promise<{ result: TranscriptResult; providerUsed: string }> {
  if (provider.startsWith("local-llm:")) {
    const llm = await getLocalLlm(provider.replace("local-llm:", ""));
    const whisperResult = await transcribeWithLocalWhisper(audioPath, jobDir, language);
    const cleanedText = await cleanupTranscriptWithLocalLlm(llm, whisperResult.text);

    return {
      result: {
        text: normalizeTranscript(cleanedText),
        language: whisperResult.language
      },
      providerUsed: `${llm.kind}:${llm.name}:${llm.model}`
    };
  }

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

  return {
    result: await transcribeWithLMStudio(audioPath, language),
    providerUsed: `lm-studio:${process.env.LM_STUDIO_TRANSCRIPTION_MODEL || "default"}`
  };
}

export async function maybeCleanupWithLMStudio(transcript: string): Promise<string> {
  const baseUrl = process.env.LM_STUDIO_BASE_URL || "http://127.0.0.1:1234";
  const model = process.env.LM_STUDIO_CLEANUP_MODEL || process.env.LM_STUDIO_TRANSCRIPTION_MODEL;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Clean up this speech transcript for readability. Preserve meaning, do not summarize, and return only markdown-safe transcript text."
          },
          { role: "user", content: transcript }
        ],
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(60_000)
    });

    if (!response.ok) {
      return transcript;
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return normalizeTranscript(data.choices?.[0]?.message?.content ?? transcript);
  } catch {
    return transcript;
  }
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

async function transcribeWithLMStudio(audioPath: string, language?: string): Promise<TranscriptResult> {
  const baseUrl = process.env.LM_STUDIO_BASE_URL || "http://127.0.0.1:1234";
  const model = process.env.LM_STUDIO_TRANSCRIPTION_MODEL;
  const form = await createAudioForm(audioPath, model || "whisper-1", language);

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/audio/transcriptions`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(60_000)
    });
  } catch (error) {
    throw new AppError(
      "LM Studio transcription endpoint unavailable. Use local-whisper, or start an OpenAI-compatible audio endpoint in LM Studio.",
      422,
      "LM_STUDIO_UNAVAILABLE",
      error instanceof Error ? error.message : undefined
    );
  }

  if (!response.ok) {
    throw new AppError(
      "LM Studio transcription endpoint unavailable. Use local-whisper, or start an OpenAI-compatible audio endpoint in LM Studio.",
      422,
      "LM_STUDIO_UNAVAILABLE",
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
