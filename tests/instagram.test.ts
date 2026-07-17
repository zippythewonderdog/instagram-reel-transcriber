import { describe, expect, it } from "vitest";

import { AppError } from "../server/types";
import { validateInstagramUrl } from "../server/lib/instagram";

describe("validateInstagramUrl", () => {
  it("accepts public-looking Instagram reel URLs", () => {
    expect(validateInstagramUrl("https://www.instagram.com/reel/ABC123/")).toBe(
      "https://www.instagram.com/reel/ABC123/"
    );
  });

  it("accepts Instagram post and tv URLs", () => {
    expect(validateInstagramUrl("https://instagram.com/p/ABC123/")).toBe("https://instagram.com/p/ABC123/");
    expect(validateInstagramUrl("https://m.instagram.com/tv/ABC123/")).toBe(
      "https://m.instagram.com/tv/ABC123/"
    );
  });

  it("rejects malformed URLs", () => {
    expect(() => validateInstagramUrl("not a url")).toThrow(AppError);
  });

  it("rejects non-Instagram hosts", () => {
    expect(() => validateInstagramUrl("https://example.com/reel/ABC123")).toThrow("Only public Instagram URLs");
  });

  it("rejects unsupported Instagram paths", () => {
    expect(() => validateInstagramUrl("https://www.instagram.com/accounts/login/")).toThrow(
      "Paste a public Instagram Reel"
    );
  });
});
