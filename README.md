# Voxa

*The intelligence behind every conversation.*

## O que é

Voxa é uma plataforma de inteligência conversacional baseada em IA que transforma qualquer conversa em conhecimento acionável.

Ela grava conversas localmente no macOS, identifica automaticamente quem está falando, transcreve com alta precisão, analisa a comunicação utilizando IA e gera insights que ajudam pessoas e empresas a entender melhor suas interações.

Não importa se é uma entrevista, uma reunião, uma negociação, uma venda ou uma conversa de feedback. A Voxa entende o contexto e entrega inteligência sobre o que realmente aconteceu.

## Posicionamento

**Voxa is an AI Conversation Intelligence Platform.**

Não é apenas um gravador de reuniões. É uma plataforma capaz de compreender, analisar e evoluir a forma como as pessoas se comunicam.

## Brand Statement

Every important conversation contains knowledge.
Meetings shape strategies.
Interviews reveal talent.
Sales calls uncover opportunities.
Feedback builds better teams.

But once the conversation ends, most of that knowledge disappears.
Voxa captures it, understands it and turns it into intelligence.
So every conversation becomes searchable, actionable and impossible to forget.

## Missão

Ajudar pessoas e empresas a tomar melhores decisões através da compreensão profunda das conversas.

## Visão

Ser a plataforma de inteligência conversacional mais utilizada do mundo, tornando toda conversa pesquisável, compreensível e útil.

## Proposta de valor

Cada conversa contém conhecimento valioso. A Voxa garante que nenhuma informação importante seja perdida. Ela transforma voz em memória, memória em conhecimento e conhecimento em ação.

## Principais funcionalidades

* 🎙️ Gravação nativa para macOS
* 👥 Identificação automática de speakers (diarization)
* 📝 Transcrição em tempo real ou pós-processamento
* 🧠 IA para compreender o contexto da conversa
* 💬 Resumos automáticos
* 📌 Extração de decisões, tarefas e próximos passos
* 😊 Análise de comunicação e comportamento
* 📊 Métricas de participação por pessoa
* 🔍 Busca semântica em todas as conversas
* 🏷️ Organização automática por projetos, clientes ou reuniões
* 🤖 Coach de comunicação com feedback personalizado

## Diferencial

Enquanto outras ferramentas apenas gravam reuniões, a Voxa compreende o significado das conversas. Ela identifica padrões, comportamento, oportunidades e conhecimento que normalmente passam despercebidos.

A gravação é apenas o início. O verdadeiro produto é a inteligência.

## Casos de uso

**Reuniões**: Resumos automáticos, Decisões, Action items, Follow-ups
**Entrevistas**: Comparação entre candidatos, Análise técnica
**Comunicação**: Score automático
**Vendas**: Identificação de objeções, Tempo de fala, Técnicas utilizadas, Oportunidades perdidas
**Liderança & Feedbacks**: One-on-ones, Desenvolvimento de equipes
**Customer Success**: Análise de satisfação, Riscos de churn, Sentimento do cliente

## Público-alvo

* Executivos e Gestores
* Recruiters e Equipes comerciais
* Product Managers
* Customer Success e Consultores
* Empresas que dependem de conversas para gerar valor

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
