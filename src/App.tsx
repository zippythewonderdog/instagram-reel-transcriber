import { Check, Clipboard, Download, FileText, Loader2, Mic, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  deleteTranscriptHistoryItem,
  getTranscriptHistoryItem,
  listTranscriptHistory,
  requestTranscript
} from "./api";
import type {
  TranscriptHistorySummary,
  TranscribeResponse,
  TranscriptionProvider
} from "./types";

const progressMessages = [
  "Fetching public Instagram media",
  "Extracting clean audio",
  "Transcribing speech",
  "Rendering markdown"
];

export function App() {
  const [url, setUrl] = useState("");
  const [provider, setProvider] = useState<TranscriptionProvider>("local-whisper");
  const [language, setLanguage] = useState("");
  const [historyItems, setHistoryItems] = useState<TranscriptHistorySummary[]>([]);
  const [historyStatus, setHistoryStatus] = useState("");
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [result, setResult] = useState<TranscribeResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const canSubmit = useMemo(() => url.trim().length > 0 && !isLoading, [url, isLoading]);

  useEffect(() => {
    refreshHistory().catch((caught) => {
      setHistoryStatus(caught instanceof Error ? caught.message : "Could not load transcript history.");
    });
  }, []);

  async function refreshHistory() {
    setHistoryItems(await listTranscriptHistory());
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setCopied(false);
    setIsLoading(true);

    try {
      const transcript = await requestTranscript({
        url,
        provider,
        language: language.trim() || undefined
      });
      setResult(transcript);
      setSelectedHistoryId(transcript.historyId ?? "");
      await refreshHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Transcription failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSelectHistory(id: string) {
    if (!id) {
      setSelectedHistoryId("");
      return;
    }

    setHistoryStatus("");
    setSelectedHistoryId(id);

    try {
      const item = await getTranscriptHistoryItem(id);
      setResult(item);
      setUrl(item.metadata.sourceUrl);
      setCopied(false);
    } catch (caught) {
      setHistoryStatus(caught instanceof Error ? caught.message : "Could not load history item.");
    }
  }

  async function onDeleteSelectedHistory() {
    if (!selectedHistoryId) return;

    setHistoryStatus("");

    try {
      await deleteTranscriptHistoryItem(selectedHistoryId);
      await refreshHistory();
      setSelectedHistoryId("");
      setResult(null);
      setCopied(false);
      setHistoryStatus("Deleted transcript from history.");
    } catch (caught) {
      setHistoryStatus(caught instanceof Error ? caught.message : "Could not delete history item.");
    }
  }

  async function copyMarkdown() {
    if (!result) return;
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadMarkdown() {
    if (!result) return;
    const blob = new Blob([result.markdown], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "instagram-reel-transcript.md";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="app-shell">
      <section className="tool">
        <div className="masthead">
          <div>
            <h1>Instagram Reel Transcript</h1>
            <p>Paste a public Reel URL and turn its audio into clean Markdown.</p>
          </div>
          <div className="mark" aria-hidden="true">
            <Mic size={30} />
          </div>
        </div>

        <form className="control-panel" onSubmit={onSubmit}>
          <label className="field field-wide">
            <span>Instagram URL</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              disabled={isLoading}
            />
          </label>

          <label className="field">
            <span>Provider</span>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as TranscriptionProvider)}
              disabled={isLoading}
            >
              <option value="local-whisper">Local Whisper</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>

          <label className="field">
            <span>Language</span>
            <input
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              placeholder="auto, en, es..."
              disabled={isLoading}
            />
          </label>

          <button className="primary-action" type="submit" disabled={!canSubmit}>
            {isLoading ? <Loader2 className="spin" size={20} /> : <FileText size={20} />}
            Generate transcript
          </button>
        </form>

        {isLoading ? (
          <div className="progress-list" aria-live="polite">
            {progressMessages.map((message, index) => (
              <div className="progress-item" key={message}>
                {index === 2 ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
                <span>{message}</span>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <div className="error-panel">{error}</div> : null}
      </section>

      <section className="output">
        <div className="output-header">
          <div>
            <h2>Markdown Output</h2>
            <p>{result ? `Generated with ${result.providerUsed}` : "Transcript output will appear here."}</p>
          </div>
          <div className="output-actions">
            <button type="button" onClick={copyMarkdown} disabled={!result}>
              {copied ? <Check size={18} /> : <Clipboard size={18} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={downloadMarkdown} disabled={!result}>
              <Download size={18} />
              Download
            </button>
          </div>
        </div>

        <section className="history-panel">
          <label className="field">
            <span>Transcript History</span>
            <select value={selectedHistoryId} onChange={(event) => onSelectHistory(event.target.value)}>
              <option value="">Select a previous Reel</option>
              {historyItems.map((item) => (
                <option value={item.id} key={item.id}>
                  {formatHistoryLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onDeleteSelectedHistory} disabled={!selectedHistoryId}>
            <Trash2 size={18} />
            Delete
          </button>
        </section>

        {historyStatus ? <div className="status-panel history-status">{historyStatus}</div> : null}

        <textarea
          className="markdown-box"
          value={result?.markdown ?? ""}
          readOnly
          placeholder="# Instagram Reel Transcript&#10;&#10;Your Markdown transcript will land here."
        />

        <article className="preview" aria-label="Markdown preview">
          {result ? (
            <>
              <h3>Transcript Preview</h3>
              <p>{result.rawTranscript}</p>
            </>
          ) : (
            <p className="empty">Waiting for audio. Very patient. Slightly dramatic.</p>
          )}
        </article>
      </section>
    </main>
  );
}

function formatHistoryLabel(item: TranscriptHistorySummary): string {
  const title = item.title || new URL(item.sourceUrl).pathname.split("/").filter(Boolean).join("/");
  return `${title} - ${new Date(item.createdAt).toLocaleString()}`;
}
