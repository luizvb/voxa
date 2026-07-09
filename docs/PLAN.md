# Plan

## Architecture

```text
Electron Renderer
  -> preload API
  -> Electron Main
  -> Go sidecar recorderd
  -> capture driver
     -> simulated driver for tests
     -> macOS native driver for production
  -> WAV/session artifacts
```

## Milestones

### M0: Testable Skeleton

- Go module with recorder engine.
- Deterministic simulated mic/system streams.
- WAV outputs: `mic.wav`, `system.wav`, `mix.wav`.
- Node tests for Electron packaging/IPC contract.
- Go unit tests for recorder output.

### M1: Electron Control Surface

- Start/stop/status controls.
- Session path display.
- Sidecar spawn and error handling.
- Permission checklist UI for macOS.

### M2: macOS Native Capture

- Implement `capture.NativePair`.
- Preferred path: Swift helper using Core Audio Tap for system audio plus AVAudioEngine/CoreAudio for microphone.
- Alternative path: Electron `desktopCapturer` loopback for faster prototype, with permission caveats.
- Stream PCM into Go over stdout or Unix socket.

### M3: Packaging

- electron-builder config with microphone and audio-capture usage descriptions.
- Hardened runtime and entitlements.
- Signed/notarized build.

## Test Plan

- Go unit tests:
  - WAV header/data size correctness.
  - deterministic simulated bidirectional samples;
  - recorder creates all expected artifacts;
  - mixed track clips safely.
- Node tests:
  - package manifest has macOS audio permission keys;
  - Go sidecar probe returns expected JSON contract;
  - simulated recording creates all expected files.
- Manual macOS tests for M2:
  - first-run permission prompt;
  - record microphone only;
  - record system audio only;
  - record both while a call/video is playing;
  - verify silence detection and cleanup after stop.

## Acceptance Criteria

- `go test ./...` passes.
- `npm test` passes without needing Electron runtime.
- `./bin/recorderd record-simulated --out <dir> --seconds 1` creates valid non-empty WAV files.
- Production capture remains isolated behind an interface until permissions/hardware validation is done.
