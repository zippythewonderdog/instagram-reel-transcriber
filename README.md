# Instagram Reel Transcriber

A local-first web app for turning the audio from a public Instagram Reel into a
Markdown transcript.

Paste a public Instagram Reel URL, choose a transcription provider, run the job,
then copy or download the generated Markdown. The default path uses local
Whisper, so you can transcribe without sending audio to a cloud API. Optional
OpenAI transcription is available when you provide an API key.

## What It Does

- Accepts public Instagram Reel URLs.
- Downloads public Reel media with `yt-dlp`.
- Normalizes audio with `ffmpeg`.
- Transcribes with the local `whisper` CLI by default.
- Optionally transcribes with OpenAI's audio transcription API.
- Produces clean Markdown transcript output.
- Saves successful transcriptions to local history.
- Lets you copy or download the Markdown transcript.
- Runs locally, with LAN access available through the Vite dev server.

The app intentionally supports public Instagram URLs only. It does not store
Instagram credentials, cookies, or login sessions.

## System Requirements

This project is built for a local macOS/Linux-style development environment.
It has been developed and tested on macOS.

Required:

- Node.js 22 or newer
- npm
- `yt-dlp` available on your `PATH`
- `ffmpeg` available on your `PATH`
- OpenAI Whisper CLI available as `whisper` for local transcription
- Network access to public Instagram Reel URLs

Optional:

- `OPENAI_API_KEY` if you want to use the OpenAI transcription provider

On macOS with Homebrew, the system dependencies can usually be installed with:

```bash
brew install node yt-dlp ffmpeg openai-whisper
```

If your package manager does not provide `openai-whisper`, install Whisper by
another supported method. The important bit is that this command works:

```bash
whisper --help
```

## Installation

Clone the repo and install Node dependencies:

```bash
git clone https://github.com/zippythewonderdog/instagram-reel-transcriber.git
cd instagram-reel-transcriber
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

The default `.env.example` values are:

```env
OPENAI_API_KEY=
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe
WHISPER_MODEL=tiny
PORT=3001
```

For local Whisper only, you do not need an OpenAI key. For OpenAI
transcription, set `OPENAI_API_KEY` in `.env`.

## Running the App

Start the frontend and backend together:

```bash
npm run dev
```

By default:

- Frontend: `http://localhost:5173/`
- Backend API: `http://127.0.0.1:3001`

If port `5173` is busy, Vite may choose the next available frontend port. Trust
the URL printed in the terminal, because computers love making one simple thing
slightly theatrical.

For access from another machine on your local network, open the Vite network URL
printed by `npm run dev`, usually something like:

```text
http://<your-machine-ip>:5173/
```

The Vite server is configured to listen on `0.0.0.0`. If you access it through a
custom LAN hostname and Vite blocks the request, add that hostname to
`server.allowedHosts` in `vite.config.ts`.

## Usage

1. Open the web app.
2. Paste a public Instagram Reel URL.
3. Choose `Local Whisper` or `OpenAI`.
4. Optionally enter a language code or name.
5. Click the transcribe button.
6. Review the Markdown transcript.
7. Copy or download the `.md` output.

Successful transcripts are saved locally and can be selected again from the
transcription history list.

## Local Data And Cache

The app stores local runtime data in ignored project folders:

- `data/transcript-history.json` stores previous successful transcripts.
- `.cache/whisper` stores Whisper model files.
- `tmp` is used for temporary media/audio processing during a job.

No database is required for the current version.

## Useful Commands

```bash
npm run dev
npm run build
npm start
npm test
npm run lint
npm run clean
npm run clean:models
```

Command notes:

- `npm run dev` starts the Express backend and Vite frontend.
- `npm run build` type-checks and builds the frontend.
- `npm start` runs the app in production mode locally.
- `npm test` runs the Vitest test suite.
- `npm run lint` runs TypeScript checks.
- `npm run clean` removes build/cache clutter.
- `npm run clean:models` removes cached Whisper models.

## Troubleshooting

### `whisper` command not found

Install the Whisper CLI and confirm it is available:

```bash
whisper --help
```

### First local transcription is slow

Whisper may need to download the selected model the first time it runs. Models
are cached under `.cache/whisper`.

You can change the model in `.env`:

```env
WHISPER_MODEL=tiny
```

Common options include `tiny`, `base`, `small`, and `turbo`, depending on your
installed Whisper version.

### Instagram download fails

Make sure the Reel is public and accessible in a browser without logging in.
This app does not use cookies or credentials.

You can also update `yt-dlp`:

```bash
brew upgrade yt-dlp
```

### OpenAI transcription fails

If using the OpenAI provider, make sure `.env` includes:

```env
OPENAI_API_KEY=your_api_key_here
```

The default OpenAI transcription model is:

```env
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-transcribe
```

### LAN hostname is blocked

If you see an error like:

```text
Blocked request. This host is not allowed.
```

Add the hostname to `server.allowedHosts` in `vite.config.ts`, or use the local
network IP address printed by Vite when you run `npm run dev`.
