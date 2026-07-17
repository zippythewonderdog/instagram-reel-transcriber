import { describe, expect, it } from "vitest";

import { normalizeTranscript, renderTranscriptMarkdown } from "../server/lib/markdown";

describe("normalizeTranscript", () => {
  it("trims whitespace and collapses excessive blank lines", () => {
    expect(normalizeTranscript(" hello  \n\n\nworld \n")).toBe("hello\n\nworld");
  });
});

describe("renderTranscriptMarkdown", () => {
  it("renders the required markdown shape", () => {
    const markdown = renderTranscriptMarkdown(
      {
        sourceUrl: "https://www.instagram.com/reel/ABC/",
        provider: "local-whisper",
        language: "en",
        generatedAt: "7/12/2026, 10:00:00 AM"
      },
      "Hello from the reel."
    );

    expect(markdown).toContain("# Instagram Reel Transcript");
    expect(markdown).toContain("Source: https://www.instagram.com/reel/ABC/");
    expect(markdown).toContain("Provider: local-whisper");
    expect(markdown).toContain("Language: en");
    expect(markdown).toContain("## Transcript");
    expect(markdown).toContain("Hello from the reel.");
  });

  it("uses an explicit no speech fallback", () => {
    expect(
      renderTranscriptMarkdown(
        {
          sourceUrl: "https://www.instagram.com/reel/ABC/",
          provider: "local-whisper",
          language: "auto-detected",
          generatedAt: "now"
        },
        ""
      )
    ).toContain("_No speech detected._");
  });
});
