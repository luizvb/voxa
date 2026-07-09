# Bidirectional Voice Recorder

macOS Electron app with a Go sidecar for recording microphone and system audio sessions.

## Features

- Record microphone audio.
- Optionally include system audio through Electron desktop capture when macOS permissions allow it.
- Mix microphone and system audio into a single playable WebM recording.
- Save recordings locally with metadata.
- Browse recording history inside the app.
- Replay previous recordings with the built-in audio player.
- Transcribe selected recordings with Deepgram Nova-3 speaker diarization.
- Toggle Standard or Max quality transcription for future freemium tiers.
- Use the Go sidecar for deterministic recorder tests and WAV artifact generation.

## Architecture

```text
Electron renderer
  -> MediaRecorder + Web Audio mix
  -> Electron main process
  -> local recording store
  -> Deepgram transcription + diarization
  -> Go sidecar recorderd for CLI/testable recorder engine
```

Go is used for the recorder engine, session model, WAV writing, CLI sidecar, and deterministic tests. macOS system-audio capture remains isolated behind a driver boundary because the production-grade path depends on Apple Core Audio Tap permissions and runtime behavior.

## Run

Install dependencies:

```bash
npm install
```

Start the Electron app:

```bash
export DEEPGRAM_API_KEY="your_deepgram_key"
npm run dev
```

The first recording may trigger macOS microphone and screen/system-audio prompts. If system audio capture fails in development mode, uncheck `Include system audio` to validate microphone recording, history, and playback first.

## Transcription

Select a recording in History, choose a quality mode, and click `Transcribe selected`.

- Standard: Deepgram `nova-3`, `diarize_model=latest`, smart formatting, punctuation.
- Max quality: Standard plus paragraphs, utterances, and language detection.

The app stores transcript artifacts next to each recording:

- `transcript.deepgram.json`
- `transcript.md`

Go sidecar smoke:

```bash
npm run build:go
./bin/recorderd probe
./bin/recorderd record-simulated --out ./tmp/session --seconds 2
```

## Test

```bash
npm run test:all
```

## Project Docs

- `docs/DISCOVERY.md` documents the macOS audio-capture research.
- `docs/PLAN.md` describes the implementation milestones and test plan.

## macOS Capture Path

The production driver should use one of two capture paths:

- Electron/Chromium loopback via `desktopCapturer` for faster prototype, accepting screen/system-audio permission caveats.
- Native Core Audio Tap helper for cleaner system-audio capture on macOS 14.2+ and better raw PCM ownership.

See `docs/DISCOVERY.md` and `docs/PLAN.md`.

## License

MIT
