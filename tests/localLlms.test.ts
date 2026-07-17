import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLocalLlm, deleteLocalLlm, listLocalLlms, testLocalLlm } from "../server/lib/localLlms";

let tempDir = "";
const originalFetch = globalThis.fetch;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "local-llm-test-"));
  process.env.LOCAL_LLM_STORE_PATH = path.join(tempDir, "local-llms.json");
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  delete process.env.LOCAL_LLM_STORE_PATH;
  await rm(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("local LLM store", () => {
  it("creates, lists, and deletes LM Studio configs", async () => {
    const created = await createLocalLlm({
      name: "Local cleanup",
      kind: "lm-studio",
      baseUrl: "http://127.0.0.1:1234/v1",
      model: "test-model"
    });

    expect(created.baseUrl).toBe("http://127.0.0.1:1234");
    expect(await listLocalLlms()).toHaveLength(1);

    await deleteLocalLlm(created.id);
    expect(await listLocalLlms()).toEqual([]);
  });
});

describe("testLocalLlm", () => {
  it("checks model availability and chat completion", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: "loaded-model" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    await expect(
      testLocalLlm({
        name: "Loaded model",
        kind: "lm-studio",
        baseUrl: "http://127.0.0.1:1234",
        model: "loaded-model"
      })
    ).resolves.toMatchObject({ ok: true });
  });

  it("reports when the requested model is not loaded", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: "other-model" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(
      testLocalLlm({
        name: "Missing model",
        kind: "lm-studio",
        baseUrl: "http://127.0.0.1:1234",
        model: "missing-model"
      })
    ).resolves.toMatchObject({
      ok: false,
      message: 'LM Studio is reachable, but "missing-model" is not loaded.'
    });
  });
});
