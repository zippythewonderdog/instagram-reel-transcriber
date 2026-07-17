import { execFile } from "node:child_process";

import { AppError } from "../types";

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {}
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        timeout: options.timeoutMs ?? 10 * 60 * 1000,
        maxBuffer: 1024 * 1024 * 30
      },
      (error, stdout, stderr) => {
        const output = {
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? "")
        };

        if (error) {
          const message = [output.stderr, output.stdout, error.message].filter(Boolean).join("\n");
          reject(new AppError(`Command failed: ${command}`, 500, "COMMAND_FAILED", message));
          return;
        }

        resolve(output);
      }
    );
  });
}

export function mapDownloaderError(error: unknown): AppError {
  if (error instanceof AppError) {
    const detail = error.details?.toLowerCase() ?? "";
    if (
      detail.includes("login") ||
      detail.includes("private") ||
      detail.includes("cookies") ||
      detail.includes("not available") ||
      detail.includes("unable to extract")
    ) {
      return new AppError(
        "Instagram blocked this public-only fetch. This app does not store logins or cookies in v1.",
        422,
        "PUBLIC_FETCH_BLOCKED",
        error.details
      );
    }
    return error;
  }

  return new AppError("Media download failed.", 500, "DOWNLOAD_FAILED");
}
