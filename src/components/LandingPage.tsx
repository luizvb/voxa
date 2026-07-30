import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Headphones,
  Mic,
  Play,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';
import Login, { type LoginContext } from './Login';
import { useLanguage } from '../contexts/LanguageContext';
import './LandingPage.css';

type LandingPageProps = {
  loginContext: LoginContext;
  onOpenLogin: (context?: LoginContext) => void;
  onCloseLogin: () => void;
  showLogin: boolean;
};

const waveform = [18, 28, 38, 22, 45, 54, 31, 18, 42, 62, 34, 51, 72, 46, 28, 38, 56, 31, 20, 45, 64, 36, 25, 49, 57, 34, 18, 28];

const LANDING_COPY = {
  pt: {
    meta: {
      title: 'Voxa — análise completa do seu inglês em uma conversa',
      description: 'Grave uma conversa e receba transcrição com áudio, feedback de pronúncia e sotaque, nível CEFR, insights e um plano para evoluir.',
    },
    a11y: {
      home: 'Voxa — início',
      navigation: 'Navegação principal',
      openMenu: 'Abrir menu',
      closeMenu: 'Fechar menu',
      close: 'Fechar',
    },
    nav: {
      how: 'Como funciona',
      feedback: 'O que você recebe',
      audience: 'Para quem é',
      access: 'Acessar web',
      try: 'Testar o Voxa na web',
    },
    hero: {
      eyebrow: 'Uma conversa. Todas as respostas.',
      titleBefore: 'Seu inglês, ',
      titleAccent: 'analisado por completo',
      titleAfter: '.',
      description: 'Grave uma conversa. Você recebe a transcrição com áudio, feedback de pronúncia e sotaque, nível CEFR, insights da conversa e um plano claro para evoluir.',
      example: 'Veja o que você recebe',
      trust: ['Áudio + transcrição', 'Pronúncia + sotaque', 'Nível + plano'],
      noteTop: 'Pronúncia e sotaque',
      noteTopDetail: 'feedback no trecho exato',
      noteBottom: 'Insights + plano',
      noteBottomDetail: 'do padrão à próxima prática',
    },
    steps: {
      eyebrow: 'Só dois passos',
      titleFirst: 'Você fala.',
      titleSecond: 'O Voxa analisa tudo.',
      record: 'Fale do seu jeito',
      recordDetail: 'Sem roteiro e sem prova genérica. Grave uma aula, reunião, prática ou qualquer conversa em inglês.',
      receive: 'Veja tudo em um só lugar',
      receiveDetail: 'Ouça cada trecho, entenda o que aconteceu na conversa e saiba exatamente o que praticar depois.',
      results: ['Transcrição sincronizada com o áudio', 'Pronúncia, sotaque e fluência', 'Nível CEFR, insights e plano'],
    },
    insights: {
      eyebrow: 'Da fala ao próximo passo',
      title: 'Cada análise responde a uma dúvida diferente.',
      description: 'Seu nível importa. Mas é a combinação entre áudio, fala, contexto e padrões da conversa que mostra como você realmente pode melhorar.',
      outcomes: [
        ['Áudio + transcrição', 'Volte ao momento exato, ouça sua fala e acompanhe cada palavra da conversa.'],
        ['Pronúncia e sotaque', 'Veja quais sons estão claros, quais exigem esforço e como praticá-los.'],
        ['Nível e insights', 'Entenda seu CEFR e os padrões na forma como você explica, responde e organiza ideias.'],
        ['Plano de evolução', 'Receba prioridades e práticas criadas a partir do que você realmente falou.'],
      ],
    },
    audience: {
      eyebrow: 'Para acompanhar evolução de verdade',
      titleFirst: 'Para quem aprende.',
      titleSecond: 'Para quem ensina.',
      learnerLabel: 'Para quem aprende',
      learnerTitle: 'Acompanhe o inglês que você realmente usa.',
      learnerDescription: 'Veja como seu nível, pronúncia e comunicação mudam entre conversas e pratique com uma direção clara.',
      teacherLabel: 'Para professores',
      teacherTitle: 'Transforme cada conversa em feedback que o aluno consegue usar.',
      teacherDescription: 'Revise o áudio, mostre evidências da fala e leve prioridades objetivas para a próxima aula.',
    },
    final: {
      eyebrow: 'Uma conversa. Uma visão completa.',
      titleFirst: 'Ouça, entenda',
      titleSecond: 'e melhore seu inglês.',
      description: 'Grave sua próxima conversa e receba todas as análises, avaliações e práticas que você precisa para evoluir.',
      note: 'Sem download. Comece pelo navegador.',
    },
    footer: 'Feedback de inglês a partir de conversas reais.',
    demo: {
      conversation: 'Conversa em inglês',
      participants: '2 participantes',
      example: 'Exemplo de análise',
      play: 'Reproduzir exemplo de áudio',
      practice: 'Pratique este som',
      reduce: 'Reduza a segunda sílaba:',
      pronunciation: 'Pronúncia',
      fluency: 'Fluência',
      clarity: 'Clareza',
      accent: 'Sotaque',
    },
    insightDemo: {
      example: 'Exemplo de análise',
      feedback: 'Feedback para evoluir',
      level: 'CEFR · B2 estimado',
      reading: 'Leitura da conversa',
      summary: 'Nesta conversa, sua fala se aproxima do nível B2 do CEFR. Você sustenta bem suas ideias; o próximo salto está em responder com mais objetividade.',
      strength: 'Ponto forte',
      strengthTitle: 'Clareza ao explicar',
      strengthDetail: 'As ideias seguem uma ordem fácil de acompanhar.',
      priority: 'Prioridade',
      priorityTitle: 'Respostas mais diretas',
      priorityDetail: 'Comece pela conclusão e depois traga o contexto.',
      accent: 'Sotaque e clareza',
      accentResult: 'Claro na maior parte da conversa',
      accentAria: 'Clareza alta',
      accentDetail: 'Seu sotaque faz parte da sua voz. Pratique apenas os sons que podem exigir esforço de quem escuta.',
      next: 'Próxima prática',
      nextDetail: 'Grave uma resposta de 60 segundos começando pela sua conclusão.',
      created: 'orientação criada a partir desta conversa',
    },
  },
  en: {
    meta: {
      title: 'Voxa — a complete analysis of your English from one conversation',
      description: 'Record a conversation and get an audio transcript, pronunciation and accent feedback, your CEFR level, conversation insights, and an improvement plan.',
    },
    a11y: {
      home: 'Voxa — home',
      navigation: 'Main navigation',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      close: 'Close',
    },
    nav: {
      how: 'How it works',
      feedback: 'What you get',
      audience: 'Who it’s for',
      access: 'Open web app',
      try: 'Test Voxa on the web',
    },
    hero: {
      eyebrow: 'One conversation. Every answer.',
      titleBefore: 'Your English, ',
      titleAccent: 'analyzed completely',
      titleAfter: '.',
      description: 'Record a conversation. You get an audio transcript, pronunciation and accent feedback, your CEFR level, conversation insights, and a clear improvement plan.',
      example: 'See what you get',
      trust: ['Audio + transcript', 'Pronunciation + accent', 'Level + plan'],
      noteTop: 'Pronunciation and accent',
      noteTopDetail: 'feedback at the exact moment',
      noteBottom: 'Insights + plan',
      noteBottomDetail: 'from pattern to next practice',
    },
    steps: {
      eyebrow: 'Just two steps',
      titleFirst: 'You speak.',
      titleSecond: 'Voxa analyzes everything.',
      record: 'Speak the way you normally do',
      recordDetail: 'No script and no generic test. Record a lesson, meeting, practice session, or any conversation in English.',
      receive: 'See everything in one place',
      receiveDetail: 'Replay every moment, understand what happened in the conversation, and know exactly what to practice next.',
      results: ['Transcript synced with audio', 'Pronunciation, accent, and fluency', 'CEFR level, insights, and plan'],
    },
    insights: {
      eyebrow: 'From speech to your next step',
      title: 'Every analysis answers a different question.',
      description: 'Your level matters. But the combination of audio, speech, context, and conversation patterns shows how you can actually improve.',
      outcomes: [
        ['Audio + transcript', 'Return to the exact moment, hear your speech, and follow every word in the conversation.'],
        ['Pronunciation and accent', 'See which sounds are clear, which require effort, and how to practice them.'],
        ['Level and insights', 'Understand your CEFR level and patterns in how you explain, respond, and organize ideas.'],
        ['Improvement plan', 'Get priorities and practice built from what you actually said.'],
      ],
    },
    audience: {
      eyebrow: 'For progress you can actually track',
      titleFirst: 'For learners.',
      titleSecond: 'For teachers.',
      learnerLabel: 'For learners',
      learnerTitle: 'Track the English you actually use.',
      learnerDescription: 'See how your level, pronunciation, and communication change across conversations, then practice with clear direction.',
      teacherLabel: 'For teachers',
      teacherTitle: 'Turn every conversation into feedback students can use.',
      teacherDescription: 'Review the audio, show evidence from their speech, and bring clear priorities into the next lesson.',
    },
    final: {
      eyebrow: 'One conversation. The complete picture.',
      titleFirst: 'Listen, understand,',
      titleSecond: 'and improve your English.',
      description: 'Record your next conversation and get every analysis, evaluation, and practice you need to improve.',
      note: 'No download. Start in your browser.',
    },
    footer: 'English feedback from real conversations.',
    demo: {
      conversation: 'English conversation',
      participants: '2 participants',
      example: 'Analysis example',
      play: 'Play sample audio',
      practice: 'Practice this sound',
      reduce: 'Reduce the second syllable:',
      pronunciation: 'Pronunciation',
      fluency: 'Fluency',
      clarity: 'Clarity',
      accent: 'Accent',
    },
    insightDemo: {
      example: 'Analysis example',
      feedback: 'Feedback to improve',
      level: 'CEFR · Estimated B2',
      reading: 'Conversation read',
      summary: 'In this conversation, your spoken English is close to CEFR B2. You support your ideas well; your next step is to answer more directly.',
      strength: 'Strength',
      strengthTitle: 'Clear explanations',
      strengthDetail: 'Your ideas follow an order that is easy to understand.',
      priority: 'Priority',
      priorityTitle: 'More direct answers',
      priorityDetail: 'Lead with the conclusion, then add context.',
      accent: 'Accent and clarity',
      accentResult: 'Clear for most of the conversation',
      accentAria: 'High clarity',
      accentDetail: 'Your accent is part of your voice. Practice only the sounds that may require extra effort from the listener.',
      next: 'Next practice',
      nextDetail: 'Record a 60-second answer that starts with your conclusion.',
      created: 'guidance created from this conversation',
    },
  },
} as const;

type SiteLanguage = keyof typeof LANDING_COPY;

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.72, delay, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}

function VoxaWordmark({ homeLabel }: { homeLabel: string }) {
  return (
    <a className="landing-brand" href="#inicio" aria-label={homeLabel}>
      <span className="landing-brand-mark"><img src="/voxa-mark-flat.svg" alt="" /></span>
      <span>voxa</span>
    </a>
  );
}

function PrimaryCta({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="landing-primary-cta" onClick={onClick}>
      <span>{children}</span>
      <span className="landing-cta-icon" aria-hidden><ArrowUpRight /></span>
    </button>
  );
}

function AudioTimeline({ playLabel }: { playLabel: string }) {
  return (
    <div className="landing-audio">
      <button type="button" aria-label={playLabel}><Play fill="currentColor" /></button>
      <div className="landing-waveform" aria-hidden>
        {waveform.map((height, index) => <span key={`${height}-${index}`} style={{ height: `${height}%` }} />)}
      </div>
      <time>01:42</time>
    </div>
  );
}

function TranscriptProduct({ copy }: { copy: (typeof LANDING_COPY)[SiteLanguage]['demo'] }) {
  return (
    <div className="product-shell product-shell-transcript" id="transcript-example">
      <div className="product-window">
        <header className="product-toolbar">
          <div className="product-window-brand"><span>V</span> {copy.conversation}</div>
          <div className="product-window-meta"><span>{copy.participants}</span><i />18 min</div>
        </header>
        <div className="product-transcript-layout">
          <aside className="product-side-rail" aria-hidden>
            <span className="is-active"><Headphones /></span>
            <span><Sparkles /></span>
          </aside>
          <div className="product-transcript-content">
            <div className="product-demo-label">{copy.example}</div>
            <AudioTimeline playLabel={copy.play} />
            <div className="transcript-demo-row">
              <div className="speaker-avatar">L</div>
              <div>
                <div className="speaker-line"><strong>Luiz</strong><time>01:18</time></div>
                <p>
                  I <mark className="word-good">think</mark> the most important part is making the
                  experience <mark className="word-practice">comfortable</mark> for new users.
                </p>
                <div className="pronunciation-popover">
                  <div><span>comfortable</span><strong>{copy.practice}</strong></div>
                  <p>{copy.reduce} <b>COMF-tuh-bul</b></p>
                  <div className="pronunciation-scores">
                    <span>{copy.pronunciation} <b>78</b></span>
                    <span>{copy.fluency} <b>84</b></span>
                    <span>{copy.clarity} <b>90</b></span>
                    <span>{copy.accent} <b>82</b></span>
                  </div>
                </div>
              </div>
            </div>
            <div className="transcript-demo-row is-muted">
              <div className="speaker-avatar speaker-avatar-alt">M</div>
              <div>
                <div className="speaker-line"><strong>Marina</strong><time>01:31</time></div>
                <p>That makes sense. What would you change first?</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightProduct({ copy }: { copy: (typeof LANDING_COPY)[SiteLanguage]['insightDemo'] }) {
  return (
    <div className="product-shell product-shell-insight" id="insight-example">
      <div className="product-window">
        <header className="insight-window-header">
          <div><span>{copy.example}</span><strong>{copy.feedback}</strong></div>
          <span className="insight-level">{copy.level}</span>
        </header>
        <div className="insight-summary">
          <span className="insight-orb"><Sparkles /></span>
          <div>
            <small>{copy.reading}</small>
            <p>{copy.summary}</p>
          </div>
        </div>
        <div className="insight-grid">
          <article>
            <small>{copy.strength}</small>
            <strong>{copy.strengthTitle}</strong>
            <p>{copy.strengthDetail}</p>
          </article>
          <article>
            <small>{copy.priority}</small>
            <strong>{copy.priorityTitle}</strong>
            <p>{copy.priorityDetail}</p>
          </article>
        </div>
        <div className="accent-feedback">
          <div className="accent-feedback-heading">
            <span>{copy.accent}</span>
            <strong>{copy.accentResult}</strong>
          </div>
          <div className="accent-meter" aria-label={copy.accentAria}><span /></div>
          <p>{copy.accentDetail}</p>
        </div>
        <div className="next-practice">
          <span>{copy.next}</span>
          <strong>{copy.nextDetail}</strong>
          <div><Check /> {copy.created}</div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ loginContext, onOpenLogin, onCloseLogin, showLogin }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const siteLanguage: SiteLanguage = language === 'pt' ? 'pt' : 'en';
  const copy = LANDING_COPY[siteLanguage];

  useEffect(() => {
    document.body.classList.add('landing-body');
    return () => document.body.classList.remove('landing-body');
  }, []);

  useEffect(() => {
    if (language === 'es') setLanguage('en');
  }, [language, setLanguage]);

  useEffect(() => {
    document.documentElement.lang = siteLanguage === 'pt' ? 'pt-BR' : 'en';
    document.title = copy.meta.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    description?.setAttribute('content', copy.meta.description);
  }, [copy.meta.description, copy.meta.title, siteLanguage]);

  const goToLogin = () => {
    setMobileMenuOpen(false);
    onOpenLogin('generic');
  };

  return (
    <main className="landing-page" id="inicio">
      <div className="landing-noise" aria-hidden />
      <nav className="landing-nav" aria-label={copy.a11y.navigation}>
        <VoxaWordmark homeLabel={copy.a11y.home} />
        <div className="landing-nav-links">
          <a href="#como-funciona">{copy.nav.how}</a>
          <a href="#feedback">{copy.nav.feedback}</a>
          <a href="#para-quem">{copy.nav.audience}</a>
        </div>
        <button type="button" className="landing-nav-cta" onClick={goToLogin}>{copy.nav.access} <ArrowUpRight /></button>
        <button
          type="button"
          className={mobileMenuOpen ? 'landing-menu-button is-open' : 'landing-menu-button'}
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-expanded={mobileMenuOpen}
          aria-controls="landing-mobile-menu"
          aria-label={mobileMenuOpen ? copy.a11y.closeMenu : copy.a11y.openMenu}
        >
          <span /><span />
        </button>
      </nav>

      {mobileMenuOpen && (
        <motion.div
          id="landing-mobile-menu"
          className="landing-mobile-menu"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>{copy.nav.how}</a>
          <a href="#feedback" onClick={() => setMobileMenuOpen(false)}>{copy.nav.feedback}</a>
          <a href="#para-quem" onClick={() => setMobileMenuOpen(false)}>{copy.nav.audience}</a>
          <PrimaryCta onClick={goToLogin}>{copy.nav.try}</PrimaryCta>
        </motion.div>
      )}

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <motion.span
            className="landing-eyebrow"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, ease: [0.32, 0.72, 0, 1] }}
          >
            {copy.hero.eyebrow}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.06, ease: [0.32, 0.72, 0, 1] }}
          >
            {copy.hero.titleBefore}<em>{copy.hero.titleAccent}</em>{copy.hero.titleAfter}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.12, ease: [0.32, 0.72, 0, 1] }}
          >
            {copy.hero.description}
          </motion.p>
          <motion.div
            className="landing-hero-actions"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.18, ease: [0.32, 0.72, 0, 1] }}
          >
            <PrimaryCta onClick={goToLogin}>{copy.nav.try}</PrimaryCta>
            <a className="landing-text-link" href="#feedback">{copy.hero.example} <ArrowDown /></a>
          </motion.div>
          <motion.div
            className="landing-trust-line"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.32 }}
          >
            {copy.hero.trust.map((item) => <span key={item}><Check /> {item}</span>)}
          </motion.div>
        </div>

        <motion.div
          className="landing-hero-product"
          initial={{ opacity: 0, y: 30, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0.6 }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="hero-floating-note hero-note-top"><span>{copy.hero.noteTop}</span><strong>{copy.hero.noteTopDetail}</strong></div>
          <TranscriptProduct copy={copy.demo} />
          <div className="hero-floating-note hero-note-bottom"><span>{copy.hero.noteBottom}</span><strong>{copy.hero.noteBottomDetail}</strong></div>
        </motion.div>
      </section>

      <section className="landing-steps" id="como-funciona">
        <Reveal className="landing-section-heading">
          <span className="landing-eyebrow">{copy.steps.eyebrow}</span>
          <h2>{copy.steps.titleFirst}<br />{copy.steps.titleSecond}</h2>
        </Reveal>
        <div className="landing-step-grid">
          <Reveal className="landing-step" delay={0.04}>
            <span className="step-number">01</span>
            <div className="step-icon"><Mic /></div>
            <h3>{copy.steps.record}</h3>
            <p>{copy.steps.recordDetail}</p>
            <div className="mini-recorder">
              <i /><div>{waveform.slice(0, 18).map((height, index) => <span key={`${height}-${index}`} style={{ height: `${height}%` }} />)}</div><time>00:38</time>
            </div>
          </Reveal>
          <Reveal className="landing-step landing-step-accent" delay={0.1}>
            <span className="step-number">02</span>
            <div className="step-icon"><Sparkles /></div>
            <h3>{copy.steps.receive}</h3>
            <p>{copy.steps.receiveDetail}</p>
            <div className="mini-feedback">
              {copy.steps.results.map((item) => <span key={item}><Check /> {item}</span>)}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="landing-insights" id="feedback">
        <div className="landing-insight-copy">
          <Reveal>
            <span className="landing-eyebrow">{copy.insights.eyebrow}</span>
            <h2>{copy.insights.title}</h2>
            <p>{copy.insights.description}</p>
          </Reveal>
          <Reveal className="landing-outcomes" delay={0.08}>
            {copy.insights.outcomes.map(([title, detail], index) => (
              <div key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p><strong>{title}</strong>{detail}</p>
              </div>
            ))}
          </Reveal>
        </div>
        <Reveal className="landing-insight-product" delay={0.05}>
          <InsightProduct copy={copy.insightDemo} />
        </Reveal>
      </section>

      <section className="landing-audience" id="para-quem">
        <Reveal className="landing-section-heading audience-heading">
          <span className="landing-eyebrow">{copy.audience.eyebrow}</span>
          <h2>{copy.audience.titleFirst}<br />{copy.audience.titleSecond}</h2>
        </Reveal>
        <div className="audience-grid">
          <Reveal className="audience-card">
            <span className="audience-icon"><UserRound /></span>
            <small>{copy.audience.learnerLabel}</small>
            <h3>{copy.audience.learnerTitle}</h3>
            <p>{copy.audience.learnerDescription}</p>
          </Reveal>
          <Reveal className="audience-card audience-card-light" delay={0.08}>
            <span className="audience-icon"><UsersRound /></span>
            <small>{copy.audience.teacherLabel}</small>
            <h3>{copy.audience.teacherTitle}</h3>
            <p>{copy.audience.teacherDescription}</p>
          </Reveal>
        </div>
      </section>

      <section className="landing-final-cta">
        <Reveal className="landing-final-copy">
          <span className="landing-eyebrow">{copy.final.eyebrow}</span>
          <h2>{copy.final.titleFirst}<br />{copy.final.titleSecond}</h2>
          <p>{copy.final.description}</p>
          <PrimaryCta onClick={goToLogin}>{copy.nav.try}</PrimaryCta>
          <small>{copy.final.note}</small>
        </Reveal>
        <div className="final-orbit" aria-hidden>
          <div className="final-orbit-ring"><span><img src="/voxa-mark-flat.svg" alt="" /></span></div>
          <div className="final-orbit-caption">listen · understand · improve ·</div>
        </div>
      </section>

      <footer className="landing-footer">
        <VoxaWordmark homeLabel={copy.a11y.home} />
        <p>{copy.footer}</p>
        <button type="button" onClick={goToLogin}>{copy.nav.access} <ArrowUpRight /></button>
      </footer>

      {showLogin && (
        <motion.div
          className="landing-login-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) onCloseLogin();
          }}
        >
          <motion.div
            className="landing-login-modal"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          >
            <button type="button" className="landing-login-close" onClick={onCloseLogin} aria-label={copy.a11y.close}>
              <span /><span />
            </button>
            <Login context={loginContext} />
          </motion.div>
        </motion.div>
      )}
    </main>
  );
}
