import { describe, expect, it } from "vitest";

import { hasInstagramShareIdentifier, removeInstagramShareIdentifier } from "../src/url";

describe("Instagram share identifier cleanup", () => {
  const sharedUrl = "https://www.instagram.com/reel/DZj0C5uR7Sj/?igsh=MTU0Z2F5Mm9iYWZ5MA==";

  it("detects an igsh query parameter", () => {
    expect(hasInstagramShareIdentifier(sharedUrl)).toBe(true);
    expect(hasInstagramShareIdentifier("https://www.instagram.com/reel/DZj0C5uR7Sj/")).toBe(false);
  });

  it("removes only the igsh parameter", () => {
    expect(removeInstagramShareIdentifier(`${sharedUrl}&utm_source=copy`)).toBe(
      "https://www.instagram.com/reel/DZj0C5uR7Sj/?utm_source=copy"
    );
  });

  it("leaves invalid input unchanged", () => {
    expect(removeInstagramShareIdentifier("not a url")).toBe("not a url");
  });
});
