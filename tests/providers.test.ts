import { describe, expect, it } from "vitest";

import { transcribeAudio } from "../server/lib/providers";

describe("transcribeAudio", () => {
  it("fails gracefully when OpenAI key is missing", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await expect(transcribeAudio("openai", "/tmp/audio.wav", "/tmp")).rejects.toThrow(
      "OPENAI_API_KEY is required"
    );

    process.env.OPENAI_API_KEY = previous;
  });
});
