# Voxa recording recovery contract

Status: approved for local implementation on 2026-08-05.

## Behavior

- `FR-001`: When web recording stops, Voxa MUST durably store the complete audio and metadata in the current browser profile before requesting authentication or starting an upload.
- `FR-002`: Voxa MUST retain a failed or interrupted draft until cloud metadata persistence succeeds or the user explicitly deletes the local copy.
- `FR-003`: A signed-in user MUST be able to import a WebM audio file through the same local-first pipeline.
- `FR-004`: Retrying a draft MUST reuse its stable recording ID and any already-persisted Blob URL so a metadata failure does not force a second binary upload.
- `NFR-001`: Transient session lookup failures SHOULD use a bounded retry with backoff; failure MUST remain actionable and MUST NOT discard audio.
- `NFR-002`: Local draft metadata MUST contain no auth token and local audio MUST be removed automatically after confirmed library persistence.
- `NFR-003`: Recovery controls MUST be keyboard operable, use native buttons/links, announce async status, and remain usable at mobile and 400%-equivalent reflow widths.

## Acceptance

- `AC-001`: Given a completed recording, when session lookup fails, IndexedDB contains the full Blob before the first auth call and the workspace shows a local-copy recovery item.
- `AC-002`: Given a pending draft after reload, the workspace lists it with Retry upload, Download copy, and Delete local copy actions.
- `AC-003`: Given a prior Blob upload and failed metadata creation, retry skips binary upload, upserts the same owner-scoped recording ID, and deletes the local draft only after HTTP 201 success.
- `AC-004`: Given a valid `.webm` file, import derives duration, persists locally, uploads it, creates the library row, and opens the conversation.
- `AC-005`: Given an unsupported/empty/over-limit file, import blocks before upload with an actionable inline error and preserves the selected title.
- `AC-006`: Given IndexedDB/quota failure, cloud upload does not start and the just-finished in-memory recording remains downloadable without a page reload.

## Design states

- Workspace recovery panel: `protected/uploading/failed`, with title, duration, size, status, retry, download, and explicit delete.
- Recorder status: `saving local copy -> uploading -> saved` and `local copy protected; upload needs attention`.
- Import dialog: Audio and Transcript modes reuse the existing modal, title field, cancel behavior, focus treatment, and inline error pattern.
- No new visual language: existing neutral cards, success/error colors, buttons, spacing, and responsive rules remain authoritative.

## Boundaries

- Maximum imported file size: 1 GiB, matching the existing client-upload token limit.
- Accepted manual-import format in this slice: WebM (`audio/webm` or `video/webm`, including files with an empty browser MIME type and `.webm` extension).
- No cross-device recovery, service worker/background sync, automatic OS download, or production deployment in this slice.
