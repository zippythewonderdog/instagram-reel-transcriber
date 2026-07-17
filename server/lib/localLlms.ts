import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { AppError, type CreateLocalLlmRequest, type LocalLlmConfig, type LocalLlmTestResult } from "../types";

const DATA_DIR = path.join(process.cwd(), "data");

function getStorePath() {
  return process.env.LOCAL_LLM_STORE_PATH || path.join(DATA_DIR, "local-llms.json");
}

interface LocalLlmStore {
  llms: LocalLlmConfig[];
}

export async function listLocalLlms(): Promise<LocalLlmConfig[]> {
  return (await readStore()).llms;
}

export async function getLocalLlm(id: string): Promise<LocalLlmConfig> {
  const llm = (await listLocalLlms()).find((candidate) => candidate.id === id);

  if (!llm) {
    throw new AppError("Local LLM not found.", 404, "LOCAL_LLM_NOT_FOUND");
  }

  return llm;
}

export async function createLocalLlm(input: CreateLocalLlmRequest): Promise<LocalLlmConfig> {
  const normalized = normalizeLocalLlmInput(input);
  const store = await readStore();
  const llm: LocalLlmConfig = {
    id: randomUUID(),
    ...normalized
  };

  store.llms.push(llm);
  await writeStore(store);
  return llm;
}

export async function deleteLocalLlm(id: string): Promise<void> {
  const store = await readStore();
  const nextLlms = store.llms.filter((llm) => llm.id !== id);

  if (nextLlms.length === store.llms.length) {
    throw new AppError("Local LLM not found.", 404, "LOCAL_LLM_NOT_FOUND");
  }

  await writeStore({ llms: nextLlms });
}

export async function testLocalLlm(input: CreateLocalLlmRequest | LocalLlmConfig): Promise<LocalLlmTestResult> {
  const llm = normalizeLocalLlmInput(input);
  const baseUrl = llm.baseUrl.replace(/\/$/, "");

  try {
    const modelsResponse = await fetch(`${baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(8_000)
    });

    if (!modelsResponse.ok) {
      return {
        ok: false,
        message: "LM Studio responded, but /v1/models failed.",
        details: await modelsResponse.text()
      };
    }

    const modelCheck = await modelExists(modelsResponse, llm.model);
    if (!modelCheck.ok) {
      return modelCheck;
    }

    const chatResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: llm.model,
        messages: [{ role: "user", content: "Reply with only: ok" }],
        temperature: 0,
        max_tokens: 8
      }),
      signal: AbortSignal.timeout(20_000)
    });

    if (!chatResponse.ok) {
      return {
        ok: false,
        message: "LM Studio model was found, but chat completion failed.",
        details: await chatResponse.text()
      };
    }

    return {
      ok: true,
      message: `Connected to ${llm.name} (${llm.model}).`
    };
  } catch (error) {
    return {
      ok: false,
      message: "Could not reach LM Studio. Confirm the local server is running and reachable from this Mac.",
      details: error instanceof Error ? error.message : undefined
    };
  }
}

export async function cleanupTranscriptWithLocalLlm(llm: LocalLlmConfig, transcript: string): Promise<string> {
  const response = await fetch(`${llm.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: llm.model,
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
    throw new AppError("Local LLM cleanup failed.", 422, "LOCAL_LLM_CLEANUP_FAILED", await response.text());
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || transcript;
}

function normalizeLocalLlmInput(input: CreateLocalLlmRequest | LocalLlmConfig): CreateLocalLlmRequest {
  const name = input.name?.trim();
  const kind = input.kind;
  const model = input.model?.trim();
  const baseUrl = normalizeBaseUrl(input.baseUrl);

  if (!name) {
    throw new AppError("Local LLM name is required.", 400, "LOCAL_LLM_NAME_REQUIRED");
  }

  if (kind !== "lm-studio") {
    throw new AppError("Only LM Studio local LLMs are supported right now.", 400, "LOCAL_LLM_KIND_UNSUPPORTED");
  }

  if (!model) {
    throw new AppError("Local LLM model name is required.", 400, "LOCAL_LLM_MODEL_REQUIRED");
  }

  return {
    name,
    kind,
    baseUrl,
    model
  };
}

function normalizeBaseUrl(value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value.trim());
  } catch {
    throw new AppError("Local LLM base URL must be a valid URL.", 400, "LOCAL_LLM_URL_INVALID");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new AppError("Local LLM base URL must use http or https.", 400, "LOCAL_LLM_URL_INVALID");
  }

  parsed.pathname = parsed.pathname.replace(/\/v1\/?$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

async function modelExists(response: Response, model: string): Promise<LocalLlmTestResult> {
  const data = (await response.json()) as { data?: Array<{ id?: string }> };
  const availableModels = data.data?.map((entry) => entry.id).filter(Boolean) ?? [];

  if (availableModels.length === 0) {
    return {
      ok: false,
      message: "LM Studio is reachable, but it did not report any loaded models."
    };
  }

  if (!availableModels.includes(model)) {
    return {
      ok: false,
      message: `LM Studio is reachable, but "${model}" is not loaded.`,
      details: `Available models: ${availableModels.join(", ")}`
    };
  }

  return {
    ok: true,
    message: "Model is available."
  };
}

async function readStore(): Promise<LocalLlmStore> {
  try {
    const text = await readFile(getStorePath(), "utf8");
    const parsed = JSON.parse(text) as LocalLlmStore;
    return {
      llms: Array.isArray(parsed.llms) ? parsed.llms : []
    };
  } catch {
    return { llms: [] };
  }
}

async function writeStore(store: LocalLlmStore): Promise<void> {
  const storePath = getStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}
