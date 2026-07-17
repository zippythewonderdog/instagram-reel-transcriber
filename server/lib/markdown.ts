import type { TranscriptMetadata } from "../types";

export function normalizeTranscript(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderTranscriptMarkdown(metadata: TranscriptMetadata, transcript: string): string {
  const title = "# Instagram Reel Transcript";
  const source = `Source: ${metadata.sourceUrl}`;
  const provider = `Provider: ${metadata.provider}`;
  const language = `Language: ${metadata.language}`;
  const generated = `Generated: ${metadata.generatedAt}`;
  const body = normalizeTranscript(transcript) || "_No speech detected._";

  return `${title}

${source}
${provider}
${language}
${generated}

## Transcript

${body}
`;
}
