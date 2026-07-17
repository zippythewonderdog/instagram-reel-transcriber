import { describe, expect, it } from "vitest";

import { mapDownloaderError } from "../server/lib/commands";
import { AppError } from "../server/types";

describe("mapDownloaderError", () => {
  it("maps login/cookie downloader failures to public-only errors", () => {
    const mapped = mapDownloaderError(
      new AppError("Command failed: yt-dlp", 500, "COMMAND_FAILED", "Login required; use cookies")
    );

    expect(mapped.statusCode).toBe(422);
    expect(mapped.code).toBe("PUBLIC_FETCH_BLOCKED");
    expect(mapped.message).toContain("public-only");
  });

  it("passes through unrelated app errors", () => {
    const original = new AppError("ffmpeg exploded", 500, "COMMAND_FAILED", "codec issue");
    expect(mapDownloaderError(original)).toBe(original);
  });
});
