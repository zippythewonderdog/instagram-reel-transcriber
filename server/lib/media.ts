import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { AppError, type ExtractedMedia } from "../types";
import { mapDownloaderError, runCommand } from "./commands";

export async function createJobDir(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "ig-transcript-"));
}

export async function cleanupJobDir(jobDir: string): Promise<void> {
  await rm(jobDir, { recursive: true, force: true });
}

export async function extractInstagramAudio(url: string, jobDir: string): Promise<ExtractedMedia> {
  const outputTemplate = path.join(jobDir, "source.%(ext)s");
  const metadataPath = path.join(jobDir, "metadata.json");

  try {
    await runCommand("yt-dlp", [
      "--no-playlist",
      "--print-to-file",
      "%(.{title,duration})j",
      metadataPath,
      "-f",
      "bestaudio/best",
      "-o",
      outputTemplate,
      url
    ]);
  } catch (error) {
    throw mapDownloaderError(error);
  }

  const sourcePath = await findDownloadedMedia(jobDir);
  const normalizedAudioPath = path.join(jobDir, "audio.wav");

  await runCommand("ffmpeg", [
    "-y",
    "-i",
    sourcePath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    normalizedAudioPath
  ]);

  const metadata = await readMediaMetadata(metadataPath);
  return {
    audioPath: sourcePath,
    normalizedAudioPath,
    title: metadata.title,
    durationSeconds: metadata.duration
  };
}

async function findDownloadedMedia(jobDir: string): Promise<string> {
  const { readdir } = await import("node:fs/promises");
  const files = await readdir(jobDir);
  const media = files.find((file) => file.startsWith("source.") && !file.endsWith(".part"));

  if (!media) {
    throw new AppError("No media file was downloaded from the Instagram URL.", 422, "NO_MEDIA");
  }

  return path.join(jobDir, media);
}

async function readMediaMetadata(metadataPath: string): Promise<{ title?: string; duration?: number }> {
  try {
    const { readFile } = await import("node:fs/promises");
    const text = await readFile(metadataPath, "utf8");
    return JSON.parse(text) as { title?: string; duration?: number };
  } catch {
    return {};
  }
}
