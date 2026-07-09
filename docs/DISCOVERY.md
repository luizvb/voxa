# Discovery

## Product Goal

Build a macOS desktop recorder that captures both sides of a conversation:

- local microphone;
- remote/system audio from the call app or system output;
- session artifacts that can later feed transcription, diarization, or analysis.

## Grounded Findings

- Electron `desktopCapturer` can grant a desktop capture source with `audio: "loopback"` and renderer-side `getDisplayMedia({ audio: true })`. The official docs also note macOS permission and version caveats, including `NSAudioCaptureUsageDescription` on macOS 14.2+ and no native macOS audio capture on 12.7.6 or lower without virtual audio devices. Source: https://www.electronjs.org/docs/latest/api/desktop-capturer
- Electron docs warn that missing `NSAudioCaptureUsageDescription` can create a dead audio stream without warnings on macOS 14.2+. Source: https://www.electronjs.org/docs/latest/api/desktop-capturer
- Apple Core Audio Tap can capture outgoing audio from processes or the system, but Apple documentation is JS-heavy and the practical setup is still low-level. Useful implementation references describe `AudioHardwareCreateProcessTap`, aggregate devices, permission prompt via `NSAudioCaptureUsageDescription`, and cleanup requirements. Source: https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps and https://github.com/insidegui/AudioCap
- Community implementation notes around AudioTee show Core Audio Tap as a good fit when the app needs raw PCM in the host process and a cleaner audio-only permission flow. Source: https://stronglytyped.uk/articles/recording-system-audio-electron-macos-approaches
- PortAudio is useful for cross-platform microphone/device I/O, but it does not solve macOS system loopback by itself. Source: https://portaudio.com/

## Architecture Implication

Go is a good fit for:

- sidecar process;
- session orchestration;
- deterministic recorder tests;
- WAV/PCM handling;
- future transcription queue integration;
- CLI-first smoke tests.

Go is not the lowest-risk choice for directly owning Core Audio Tap. For production macOS system capture, prefer a small Swift/Objective-C helper or a carefully isolated cgo wrapper, then stream PCM into the Go sidecar.

## MVP Scope

1. Electron shell starts/stops recording.
2. Go sidecar exposes a stable JSON/CLI contract.
3. First capture driver is simulated, so tests are deterministic.
4. Production macOS driver is added behind the same `CapturePair` interface.

## Non-Goals For First Scaffold

- Shipping signed/notarized macOS binary.
- Implementing Core Audio Tap in cgo immediately.
- Recording every conferencing app edge case.
- Realtime transcription.
