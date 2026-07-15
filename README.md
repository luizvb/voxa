<div align="center">
  <img src="docs/assets/voxalogo.png" alt="Voxa Logo" width="400" />
</div>

*The intelligence behind every conversation.*

## What is it

Voxa is an AI-powered conversational intelligence platform that transforms any conversation into actionable knowledge.

It records conversations locally on macOS, automatically identifies who is speaking, transcribes with high accuracy, analyzes communication using AI, and generates insights that help people and businesses better understand their interactions.

Whether it's an interview, a meeting, a negotiation, a sales call, or a feedback session, Voxa understands the context and delivers intelligence on what really happened.

## Positioning

**Voxa is an AI Conversation Intelligence Platform.**

It is not just a meeting recorder. It is a platform capable of understanding, analyzing, and evolving the way people communicate.

## Brand Statement

Every important conversation contains knowledge.
Meetings shape strategies.
Interviews reveal talent.
Sales calls uncover opportunities.
Feedback builds better teams.

But once the conversation ends, most of that knowledge disappears.
Voxa captures it, understands it, and turns it into intelligence.
So every conversation becomes searchable, actionable, and impossible to forget.

## Mission

To help people and businesses make better decisions through a deep understanding of conversations.

## Vision

To be the most widely used conversational intelligence platform in the world, making every conversation searchable, understandable, and useful.

## Value Proposition

Every conversation contains valuable knowledge. Voxa ensures no important information is lost. It transforms voice into memory, memory into knowledge, and knowledge into action.

## Key Features

* 🎙️ Native macOS recording
* 👥 Automatic speaker identification (diarization)
* 📝 Real-time or post-processing transcription
* 🧠 AI to understand conversational context
* 💬 Automatic summaries
* 📌 Extraction of decisions, tasks, and next steps
* 😊 Communication and behavior analysis
* 📊 Participation metrics per person
* 🔍 Semantic search across all conversations
* 🏷️ Automatic organization by projects, clients, or meetings
* 🤖 Communication coach with personalized feedback

## Differentiator

While other tools only record meetings, Voxa understands the meaning of conversations. It identifies patterns, behavior, opportunities, and knowledge that normally go unnoticed.

Recording is just the beginning. The real product is intelligence.

## Use Cases

**Meetings**: Automatic summaries, Decisions, Action items, Follow-ups
**Interviews**: Candidate comparison, Technical analysis
**Communication**: Automatic scoring
**Sales**: Objection identification, Talk time, Techniques used, Missed opportunities
**Leadership & Feedback**: One-on-ones, Team development
**Customer Success**: Satisfaction analysis, Churn risks, Customer sentiment

## Target Audience

* Executives and Managers
* Recruiters and Commercial teams
* Product Managers
* Customer Success and Consultants
* Companies that rely on conversations to generate value

## Run (Development)

Install dependencies:
```bash
npm install
```

Start the Electron app:
```bash
cp .env.example .env
# edit .env and set DEEPGRAM_API_KEY
npm run dev
```

### Web app

The same React application also runs in Chrome and Edge. The browser build uses
the microphone plus optional tab/screen audio, while global shortcuts, the mini
widget, and silent system-wide audio capture remain desktop-only.

```bash
npm run dev:vite
npm run build:web
```

### Internal eval laboratory

In development, authenticated team members can open `http://localhost:5173/#/evals`
to generate synthetic conversations, run the production insight pipeline, grade the
result with an independent supervisor model, and compare persisted runs. The lab
supports editing and fingerprinting both the Voxa and supervisor system prompts from
a dedicated modal, exporting one case
or the merged run as CSV, and asking the supervisor for a consolidated diagnosis plus
a complete replacement prompt after the suite finishes. Configure
`VOXA_EVAL_SUPERVISOR_MODEL` with a model different from `OPENROUTER_MODEL`.

The page is removed from production builds and `/api/internal/evals/*` is not mounted
when `NODE_ENV=production`. Eval tables are initialized on first local use and are
also declared in `app/schema.sql` for explicit database setup.

Deploy the repository root to Vercel so the SPA and `/api` share one origin.
Configure `VITE_NEON_AUTH_URL`, `NEON_AUTH_URL`, `DATABASE_URL`, Blob, Deepgram,
OpenRouter, and Stripe environment variables. API requests require a Neon Auth
JWT; the server never accepts a client-provided user id.

Before deploying a backend version that changes billing persistence, apply and
verify the repository migrations with a direct Neon connection:

```bash
cd backend
DIRECT_URL="<direct-neon-connection>" npm run db:migrate
npm run db:check
```

Vercel runs the read-only schema check before compiling the backend, so code that
depends on an unapplied billing migration fails the deployment instead of failing
the authenticated plan screen at runtime.

## Desktop release (macOS + Windows)

The packaged desktop app defaults to the stable production API at
`https://backend-lake-ten-68.vercel.app`. Local development can keep using
`VITE_API_URL=http://localhost:3000`; `VOXA_API_URL` is the explicit runtime
override when needed.

Recordings are uploaded directly from Electron to the public Vercel Blob store
using multipart client uploads, then their metadata and playback URL are saved
in Neon. This avoids Vercel Function request-size limits for long recordings.

Build the installer for the current operating system:

```bash
npm run release
```

Build specific installers (the macOS DMG must be built on macOS):

```bash
npm run release:mac
npm run release:win
```

On macOS, build both the universal DMG and a portable Windows x64 ZIP:

```bash
npm run release:all
```

Artifacts are written to `release/`. The macOS build contains a universal
`recorderd` sidecar (Apple Silicon + Intel), while Windows contains
`recorderd.exe` x64. Running `release:win` on Windows produces an NSIS `.exe`
installer; cross-building Windows from macOS produces a portable `.zip` and
does not require Rosetta or Wine.

### Publish download links to Vercel Blob

The linked Vercel project has a public `voxa-releases` Blob store. After the
installers are built, publish them and generate `release/downloads.json`:

```bash
npm run release:publish
```

The script loads `BLOB_READ_WRITE_TOKEN` through `vercel env run`, uploads the
installers below `releases/v<version>/`, updates `releases/latest.json`, and
prints the public download URLs. No Blob token is written into the repository.

To sync the allowlisted values from `backend/.env` to the linked Vercel
production project and redeploy the API:

```bash
npm run vercel:env:sync
cd backend && vercel deploy --prod --yes
```

## Architecture & Under the hood

Electron app with a Go sidecar (`recorderd`) for recording microphone and system audio sessions.

```text
Electron renderer -> MediaRecorder + Web Audio mix -> Electron main process -> local recording store -> Deepgram transcription -> Go sidecar
```

## License

MIT
