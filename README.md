# Voxa

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

## Architecture & Under the hood

Electron app with a Go sidecar (`recorderd`) for recording microphone and system audio sessions.

```text
Electron renderer -> MediaRecorder + Web Audio mix -> Electron main process -> local recording store -> Deepgram transcription -> Go sidecar
```

## License

MIT
