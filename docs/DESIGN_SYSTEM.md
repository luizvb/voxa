# Voxa Desktop Design System

## Direction

Voxa is a focused desktop workspace. The interface is predominantly white with black text, neutral surfaces, precise spacing, and color reserved for real status. Recording is always the clearest action on screen.

## Window contract

- Default: `1024×768`.
- Minimum: `800×600`.
- Expanded reference: `1200×800`.
- Sidebar: `216px` at widths from `960px`; `80px` rail below `960px`, reservando espaço para os controles nativos do macOS.
- No horizontal application scroll. Long content scrolls inside the main content region.
- The macOS traffic-light clearance is `52px`.

## Color

| Role | Value |
| --- | --- |
| Background | `#FFFFFF` |
| Primary text | `#111111` |
| Secondary text | `#5F5F5A` |
| Tertiary text | `#85857F` |
| Neutral surface | `#F6F6F3` |
| Border | `#E5E5E1` |
| Recording / destructive | `#C93535` |
| Success | `#287A44` |

Do not use decorative gradients, glow, glassmorphism, neon accents, or color as decoration. Icons and text must communicate the state without relying on color alone.

## Spacing and shape

- Base grid: `8px`.
- Product gaps: `8`, `12`, `16`, `24`, and `32px`.
- Page padding: `24px`; compact layout: `16px`.
- Main control and hit target: `44px`.
- Radius: `8px` for compact controls, `10px` for buttons/inputs, `12px` for cards.
- Cards use one border and one internal padding layer. Avoid cards nested inside cards.

## Typography

- System stack: San Francisco on macOS with platform fallbacks.
- Page title: `24–30px`, semibold.
- Section title: `16–18px`, semibold.
- Body: `14px`, line height around `1.5`.
- Labels: `11–13px`.
- Timer: system monospace with tabular numerals.
- Avoid uppercase paragraphs, excessive letter spacing, or low-contrast text.

## Interaction

- Visible keyboard focus is mandatory.
- Primary controls are reachable by keyboard and have accessible labels.
- Escape closes transient UI or returns from conversation detail.
- Motion uses short `120–180ms` transitions and respects `prefers-reduced-motion`.
- Microphone permission is requested only after the user starts recording.
- Destructive actions require a dedicated confirmation dialog.

## Product flows

1. Workspace opens with recording as the dominant action.
2. Stopping saves a local draft before authentication.
3. Signed-out users authenticate without losing the pending recording.
4. After authentication, Voxa opens the saved conversation and resumes processing.
5. Library owns search and conversation selection; the sidebar contains navigation only.
6. Conversation detail keeps player, transcript, and insights in one predictable reading flow.

## QA checklist

- No horizontal overflow at `800×600`, `1024×768`, or `1200×800`.
- Every action has at least a `44×44px` interactive area.
- Portuguese, English, and Spanish copy fit without truncating critical meaning.
- Loading, empty, error/offline, success, recording, paused, and processing states are represented.
- Reduced motion and keyboard-only navigation remain functional.
- UI Kit is available only in development at `#/ui`.
