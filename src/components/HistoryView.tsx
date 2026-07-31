import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  AudioWaveform,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileAudio,
  FilePlus2,
  FileText,
  Download,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { LibraryStatus } from '../App';
import { platform, type AnalysisSummary, type PronunciationAssessment, type Recording, type TranscriptSegment, type TranscriptionLanguage } from '../platform';
import { useLanguage } from '../contexts/LanguageContext';
import { createPronunciationWavSegment, createWavSegment, findTranscriptSegmentEnd, parseTranscriptTimestamp, safeAudioSegmentName } from '../lib/audio-segment';
import { getPronunciationWordLevel, getPronunciationWordPlaybackBounds } from '../lib/pronunciation-word';
import { getSavedTranscriptionLanguage, saveTranscriptionLanguage, TRANSCRIPTION_LANGUAGES } from '../lib/transcription-language';
import AIAnalysis from './AIAnalysis';
import PronunciationWordPopover, { type PronunciationWordPopoverLabels } from './PronunciationWordPopover';

interface HistoryViewProps {
  recordings: Recording[];
  selectedId: string | null;
  onSelect: (id: string | null, autoProcess?: boolean) => void;
  loadRecordings: () => Promise<void>;
  libraryStatus: LibraryStatus;
  libraryError: string;
  onRetry: () => void;
  onStartRecording: () => void;
  isImportDialogOpen: boolean;
  onImportDialogOpenChange: (open: boolean) => void;
  autoProcess?: boolean;
}

type TranscriptState = {
  markdown?: string;
  language?: string | null;
  segments?: TranscriptSegment[];
  status?: string;
  isTranscribing: boolean;
  error?: boolean;
};

type AnalysisState = {
  analysis?: any;
  status?: string;
  isAnalyzing: boolean;
  error?: boolean;
};

type AnalysisMode = 'interview' | 'language' | 'meeting';
const ANALYSIS_MODES: AnalysisMode[] = ['interview', 'language', 'meeting'];

function getSavedAnalysisModes(): AnalysisMode[] {
  try {
    const value = JSON.parse(localStorage.getItem('voxa_analysis_modes') || '[]');
    const modes = Array.isArray(value) ? value.filter((item): item is AnalysisMode => ANALYSIS_MODES.includes(item)) : [];
    return modes.length > 0 ? modes : ['language'];
  } catch {
    return ['language'];
  }
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

type TranscriptDocumentProps = {
  markdown: string;
  segments?: TranscriptSegment[];
  youLabel: string;
  audioAvailable: boolean;
  pronunciationEnabled: boolean;
  durationSeconds: number;
  activeSegmentKey: string | null;
  downloadingSegmentKey: string | null;
  assessingSegmentId: string | null;
  isPlaying: boolean;
  playLabel: string;
  pauseLabel: string;
  downloadLabel: string;
  pronunciationLabel: string;
  pronunciationScoreLabel: string;
  pronunciationAccuracyLabel: string;
  pronunciationFluencyLabel: string;
  pronunciationCompletenessLabel: string;
  pronunciationProsodyLabel: string;
  pronunciationLimitLabel: string;
  possibleFillersLabel: string;
  possibleFillersHint: string;
  pronunciationWordLabels: PronunciationWordPopoverLabels;
  correctPronunciationAvailable: boolean;
  speakingPronunciationWordKey: string | null;
  onPlaySegment: (key: string, startSeconds: number, endSeconds: number) => void;
  onPlayPronunciationWord: (key: string, startSeconds: number, endSeconds: number) => void;
  onSpeakPronunciationWord: (key: string, word: string) => void;
  onDownloadSegment: (key: string, speaker: string, timestamp: string, startSeconds: number, endSeconds: number) => void;
  onAssessPronunciation: (segment: TranscriptSegment) => void;
};

function normalizeSpokenWord(value: string): string {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');
}

function AssessedTranscriptText({
  text,
  segment,
  assessment,
  audioAvailable,
  activeSegmentKey,
  isPlaying,
  correctPronunciationAvailable,
  speakingPronunciationWordKey,
  labels,
  onPlayPronunciationWord,
  onSpeakPronunciationWord,
}: {
  text: string;
  segment: TranscriptSegment;
  assessment?: PronunciationAssessment | null;
  audioAvailable: boolean;
  activeSegmentKey: string | null;
  isPlaying: boolean;
  correctPronunciationAvailable: boolean;
  speakingPronunciationWordKey: string | null;
  labels: PronunciationWordPopoverLabels;
  onPlayPronunciationWord: (key: string, startSeconds: number, endSeconds: number) => void;
  onSpeakPronunciationWord: (key: string, word: string) => void;
}) {
  if (!assessment?.words?.length) return <>{text}</>;
  const tokens = text.split(/(\s+|[^\p{L}\p{N}'\u2019-]+)/gu).filter(Boolean);
  let assessmentIndex = 0;
  return (
    <>
      {tokens.map((token, index) => {
        const normalized = normalizeSpokenWord(token);
        if (!normalized) return <span key={`${token}-${index}`}>{token}</span>;
        let matchedIndex = assessment.words
          .slice(assessmentIndex, assessmentIndex + 4)
          .findIndex((word) => normalizeSpokenWord(word.word) === normalized);
        if (matchedIndex < 0) return <span key={`${token}-${index}`}>{token}</span>;
        matchedIndex += assessmentIndex;
        const word = assessment.words[matchedIndex];
        assessmentIndex = matchedIndex + 1;
        const level = getPronunciationWordLevel(word);
        if (!level) return <span key={`${token}-${index}`}>{token}</span>;
        const wordKey = `pronunciation:${segment.id}:${matchedIndex}`;
        const playbackBounds = getPronunciationWordPlaybackBounds(segment, word);
        return (
          <PronunciationWordPopover
            key={`${token}-${index}`}
            token={token}
            word={word}
            level={level}
            originalAvailable={audioAvailable && playbackBounds !== null}
            originalPlaying={activeSegmentKey === wordKey && isPlaying}
            correctAvailable={correctPronunciationAvailable}
            correctPlaying={speakingPronunciationWordKey === wordKey}
            labels={labels}
            onPlayOriginal={() => {
              if (playbackBounds) onPlayPronunciationWord(wordKey, playbackBounds.startSeconds, playbackBounds.endSeconds);
            }}
            onSpeakCorrect={() => onSpeakPronunciationWord(wordKey, word.word)}
          />
        );
      })}
    </>
  );
}

function TranscriptDocument({
  markdown,
  segments,
  youLabel,
  audioAvailable,
  pronunciationEnabled,
  durationSeconds,
  activeSegmentKey,
  downloadingSegmentKey,
  assessingSegmentId,
  isPlaying,
  playLabel,
  pauseLabel,
  downloadLabel,
  pronunciationLabel,
  pronunciationScoreLabel,
  pronunciationAccuracyLabel,
  pronunciationFluencyLabel,
  pronunciationCompletenessLabel,
  pronunciationProsodyLabel,
  pronunciationLimitLabel,
  possibleFillersLabel,
  possibleFillersHint,
  pronunciationWordLabels,
  correctPronunciationAvailable,
  speakingPronunciationWordKey,
  onPlaySegment,
  onPlayPronunciationWord,
  onSpeakPronunciationWord,
  onDownloadSegment,
  onAssessPronunciation,
}: TranscriptDocumentProps) {
  if (segments?.length) {
    return (
      <article className="transcript-document">
        {segments.map((segment) => {
          const speaker = segment.speaker === 'Speaker 0' ? youLabel : segment.speaker;
          const startSeconds = segment.startMs / 1000;
          const endSeconds = segment.endMs / 1000;
          const timestamp = formatDuration(segment.startMs);
          const hasAudioSegment = audioAvailable && endSeconds > startSeconds;
          const canOfferAssessment = pronunciationEnabled && hasAudioSegment;
          const exceedsPronunciationLimit = endSeconds - startSeconds > 120;
          const segmentIsPlaying = activeSegmentKey === segment.id && isPlaying;
          const assessment = segment.assessment;
          const metrics = [
            [pronunciationAccuracyLabel, assessment?.accuracyScore],
            [pronunciationFluencyLabel, assessment?.fluencyScore],
            [pronunciationCompletenessLabel, assessment?.completenessScore],
            [pronunciationProsodyLabel, assessment?.prosodyScore],
          ].filter((metric): metric is [string, number] => typeof metric[1] === 'number');
          const possibleFillers = assessment?.possibleFillers;
          return (
            <section className="transcript-block" key={segment.id}>
              <header>
                <strong>{speaker}</strong>
                <time>{timestamp}</time>
                {hasAudioSegment && (
                  <div className="transcript-segment-actions">
                    <button type="button" className="transcript-segment-button" onClick={() => onPlaySegment(segment.id, startSeconds, endSeconds)} aria-label={segmentIsPlaying ? pauseLabel : playLabel} title={segmentIsPlaying ? pauseLabel : playLabel}>
                      {segmentIsPlaying ? <Pause /> : <Play />}
                    </button>
                    <button type="button" className="transcript-segment-button" onClick={() => onDownloadSegment(segment.id, speaker, timestamp, startSeconds, endSeconds)} disabled={downloadingSegmentKey === segment.id} aria-label={downloadLabel} title={downloadLabel}>
                      {downloadingSegmentKey === segment.id ? <Loader2 className="spin" /> : <Download />}
                    </button>
                    {canOfferAssessment && (
                      <button
                        type="button"
                        className="transcript-segment-button"
                        onClick={() => onAssessPronunciation(segment)}
                        disabled={assessingSegmentId !== null || exceedsPronunciationLimit}
                        aria-busy={assessingSegmentId === segment.id}
                        aria-label={exceedsPronunciationLimit ? pronunciationLimitLabel : pronunciationLabel}
                        title={exceedsPronunciationLimit ? pronunciationLimitLabel : pronunciationLabel}
                      >
                        {assessingSegmentId === segment.id ? <Loader2 className="spin" /> : <AudioWaveform />}
                      </button>
                    )}
                  </div>
                )}
              </header>
              <div className="transcript-segment-content">
                <p>
                  <AssessedTranscriptText
                    text={segment.text}
                    segment={segment}
                    assessment={assessment}
                    audioAvailable={audioAvailable}
                    activeSegmentKey={activeSegmentKey}
                    isPlaying={isPlaying}
                    correctPronunciationAvailable={correctPronunciationAvailable}
                    speakingPronunciationWordKey={speakingPronunciationWordKey}
                    labels={pronunciationWordLabels}
                    onPlayPronunciationWord={onPlayPronunciationWord}
                    onSpeakPronunciationWord={onSpeakPronunciationWord}
                  />
                </p>
                {assessment && (
                  <div className="pronunciation-result">
                    <strong>{pronunciationScoreLabel} <span>{assessment.overallScore === null ? '-' : `${Math.round(assessment.overallScore)}/100`}</span></strong>
                    {metrics.length > 0 && <div>{metrics.map(([label, score]) => <span key={label}>{label} {Math.round(score)}</span>)}</div>}
                    {!!possibleFillers?.totalCount && (
                      <span className="pronunciation-fillers" title={possibleFillersHint}>
                        <b>{possibleFillersLabel} {possibleFillers.totalCount}</b>
                        {' · '}
                        {possibleFillers.matches.map((match) => `${match.expression} ×${match.count}`).join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </article>
    );
  }
  if (!/^\s*\*\*[^*\n]+\*\*(?:\s*\([^\n)]*\))?\s*$/m.test(markdown)) {
    return <pre className="transcript-raw">{markdown}</pre>;
  }
  const blocks = markdown.split(/(?:\r?\n){2,}/).filter((block) => block.trim());
  const starts = blocks.map((block) => {
    const heading = block.split(/\r?\n/).find((line) => line.trim()) || '';
    const timestamp = heading.replace(/\*\*/g, '').match(/\((.*?)\)/)?.[1];
    return timestamp ? parseTranscriptTimestamp(timestamp) : null;
  });

  return (
    <article className="transcript-document">
      {blocks.map((block, index) => {
        const lines = block.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length === 1) {
          return <div className="transcript-divider" key={`${lines[0]}-${index}`}>{lines[0]}</div>;
        }

        const [heading, ...body] = lines;
        const rawHeading = heading.replace(/\*\*/g, '').trim();
        const isSelf = rawHeading.includes('Speaker 0');
        const timestamp = rawHeading.match(/\((.*?)\)/)?.[1];
        const speaker = isSelf ? youLabel : rawHeading.split('(')[0].trim();
        const startSeconds = starts[index];
        const endSeconds = findTranscriptSegmentEnd(starts, index, durationSeconds);
        const segmentKey = `${index}-${startSeconds}`;
        const hasAudioSegment = audioAvailable
          && startSeconds !== null
          && Number.isFinite(endSeconds)
          && endSeconds > startSeconds;
        const segmentIsPlaying = activeSegmentKey === segmentKey && isPlaying;

        return (
          <section className="transcript-block" key={`${rawHeading}-${index}`}>
            <header>
              <strong>{speaker}</strong>
              {timestamp && <time>{timestamp}</time>}
              {hasAudioSegment && (
                <div className="transcript-segment-actions">
                  <button
                    type="button"
                    className="transcript-segment-button"
                    onClick={() => onPlaySegment(segmentKey, startSeconds, endSeconds)}
                    aria-label={segmentIsPlaying ? pauseLabel : playLabel}
                    title={segmentIsPlaying ? pauseLabel : playLabel}
                  >
                    {segmentIsPlaying ? <Pause /> : <Play />}
                  </button>
                  <button
                    type="button"
                    className="transcript-segment-button"
                    onClick={() => onDownloadSegment(segmentKey, speaker, timestamp || '', startSeconds, endSeconds)}
                    disabled={downloadingSegmentKey === segmentKey}
                    aria-label={downloadLabel}
                    title={downloadLabel}
                  >
                    {downloadingSegmentKey === segmentKey ? <Loader2 className="spin" /> : <Download />}
                  </button>
                </div>
              )}
            </header>
            <p>{body.join(' ').trim()}</p>
          </section>
        );
      })}
    </article>
  );
}

export default function HistoryView({
  recordings,
  selectedId,
  onSelect,
  loadRecordings,
  libraryStatus,
  libraryError,
  onRetry,
  onStartRecording,
  isImportDialogOpen,
  onImportDialogOpenChange,
  autoProcess,
}: HistoryViewProps) {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [transcriptData, setTranscriptData] = useState<TranscriptState>({ isTranscribing: false });
  const [aiData, setAiData] = useState<AnalysisState>({ isAnalyzing: false });
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisSummary[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');
  const [analysisModes, setAnalysisModes] = useState<AnalysisMode[]>(getSavedAnalysisModes);
  const [analysisContext, setAnalysisContext] = useState('');
  const [detectedSpeakers, setDetectedSpeakers] = useState<string[]>([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [pdfStatus, setPdfStatus] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'analysis'>('transcript');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackSource, setPlaybackSource] = useState('');
  const [audioStatus, setAudioStatus] = useState('');
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [activeSegmentKey, setActiveSegmentKey] = useState<string | null>(null);
  const [downloadingSegmentKey, setDownloadingSegmentKey] = useState<string | null>(null);
  const [assessingSegmentId, setAssessingSegmentId] = useState<string | null>(null);
  const [speakingPronunciationWordKey, setSpeakingPronunciationWordKey] = useState<string | null>(null);
  const [pronunciationVoice, setPronunciationVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [autoProcessStep, setAutoProcessStep] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importTranscript, setImportTranscript] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<TranscriptionLanguage>(() => getSavedTranscriptionLanguage(language));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentEndRef = useRef<number | null>(null);
  const decodedAudioRef = useRef<{ source: string; buffer: AudioBuffer } | null>(null);
  const autoProcessAttemptedRef = useRef<string | null>(null);
  const pronunciationSpeechRequestRef = useRef(0);

  const selected = recordings.find((recording) => recording.id === selectedId);
  const sortedRecordings = useMemo(
    () => [...recordings].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [recordings],
  );
  const filteredRecordings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return sortedRecordings;
    return sortedRecordings.filter((recording) => recording.name.toLocaleLowerCase().includes(normalized));
  }, [query, sortedRecordings]);

  const locale = language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US';

  const stopPronunciationWordSpeech = () => {
    pronunciationSpeechRequestRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingPronunciationWordKey(null);
  };

  const speakPronunciationWord = (key: string, word: string) => {
    if (
      !pronunciationVoice
      || typeof window === 'undefined'
      || !('speechSynthesis' in window)
      || typeof SpeechSynthesisUtterance === 'undefined'
    ) return;
    if (speakingPronunciationWordKey === key) {
      stopPronunciationWordSpeech();
      return;
    }

    audioRef.current?.pause();
    window.speechSynthesis.cancel();
    const requestId = pronunciationSpeechRequestRef.current + 1;
    pronunciationSpeechRequestRef.current = requestId;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.voice = pronunciationVoice;
    const finish = () => {
      if (pronunciationSpeechRequestRef.current === requestId) {
        setSpeakingPronunciationWordKey(null);
      }
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    setSpeakingPronunciationWordKey(key);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const updateVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      setPronunciationVoice(
        voices.find((voice) => voice.lang.toLocaleLowerCase() === 'en-us')
        || voices.find((voice) => voice.lang.toLocaleLowerCase().startsWith('en-'))
        || null,
      );
    };
    updateVoice();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoice);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoice);
  }, []);

  useEffect(() => {
    pronunciationSpeechRequestRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingPronunciationWordKey(null);
    return () => {
      pronunciationSpeechRequestRef.current += 1;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedId]);

  useEffect(() => {
    async function loadSelectedRecording() {
      if (!selected) return;

      setIsPlaying(false);
      setCurrentTime(0);
      setActiveTab('transcript');
      setTranscriptData({ isTranscribing: false });
      setAiData({ isAnalyzing: false });
      setAnalysisHistory([]);
      setSelectedAnalysisId('');
      setShowDeleteDialog(false);
      setPdfStatus('');
      setDetectedSpeakers([]);
      setSelectedSpeakers([]);

      if (!selected.transcript) {
        setTranscriptData({ isTranscribing: false, status: t('history', 'noTranscript') });
        setAiData({ isAnalyzing: false, status: t('history', 'transcriptRequired') });
        return;
      }

      try {
        const result = await platform.getTranscript(selected.id);
        setTranscriptData({
          markdown: result?.markdown || '',
          language: result?.language,
          segments: result?.segments,
          isTranscribing: false,
          status: t('history', 'transcriptSaved'),
        });
        const speakers = result?.speakers || [];
        setDetectedSpeakers(speakers);
        setSelectedSpeakers(speakers);

        try {
          const history = await platform.listAnalyses(selected.id);
          const latest = history[0];
          const analysis = latest ? await platform.getAnalysis(selected.id, latest.id) : null;
          setAnalysisHistory(history);
          setSelectedAnalysisId(latest?.id || '');
          setAiData(analysis
            ? { analysis, isAnalyzing: false }
            : { isAnalyzing: false, status: t('history', 'noAnalysis') });
        } catch (error: any) {
          setAiData({ isAnalyzing: false, status: error?.message || t('history', 'loadFailed'), error: true });
        }
      } catch (error: any) {
        setTranscriptData({ isTranscribing: false, status: error?.message || t('history', 'loadFailed'), error: true });
      }
    }

    loadSelectedRecording();
  }, [selectedId, selected?.transcript, selected?.playbackUrl, t]);

  useEffect(() => {
    let disposed = false;
    let revokeSource: () => void = () => {};
    const audio = audioRef.current;

    audio?.pause();
    audio?.removeAttribute('src');
    audio?.load();
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
    setPlaybackSource('');
    setAudioStatus('');
    setActiveSegmentKey(null);
    setDownloadingSegmentKey(null);
    setAssessingSegmentId(null);
    segmentEndRef.current = null;
    decodedAudioRef.current = null;

    if (!selected || selected.hasAudio === false) return () => undefined;

    async function loadAudio() {
      setIsAudioLoading(true);
      setAudioStatus(t('history', 'audioLoading'));
      try {
        const source = platform.loadRecordingMedia
          ? await platform.loadRecordingMedia(selected!)
          : {
              url: selected!.playbackUrl || '',
              revoke: () => undefined,
            };
        if (!source.url) throw new Error(t('history', 'audioFailed'));
        if (disposed) {
          source.revoke();
          return;
        }
        revokeSource = source.revoke;
        setPlaybackSource(source.url);
        setAudioStatus('');
      } catch (error: unknown) {
        if (!disposed) setAudioStatus(error instanceof Error ? error.message : t('history', 'audioFailed'));
      } finally {
        if (!disposed) setIsAudioLoading(false);
      }
    }

    void loadAudio();
    return () => {
      disposed = true;
      audio?.pause();
      audio?.removeAttribute('src');
      audio?.load();
      revokeSource();
    };
  }, [selected?.hasAudio, selected?.id, selected?.playbackUrl, t]);

  useEffect(() => {
    async function runAutoProcess() {
      if (!autoProcess || !selected || selected.transcript || autoProcessAttemptedRef.current === selected.id) return;
      autoProcessAttemptedRef.current = selected.id;
      setIsAutoProcessing(true);
      setAutoProcessStep(t('history', 'transcribingStep'));

      try {
        const result = await platform.transcribe({ recordingId: selected.id, language: transcriptionLanguage, maxQuality: false });
        setTranscriptData({ markdown: result.markdown, language: result.language, segments: result.segments, isTranscribing: false, status: t('history', 'transcriptSaved') });
        await loadRecordings();

        setAutoProcessStep(t('history', 'analyzingStep'));
        const analysis = await platform.analyze({
          recordingId: selected.id,
          modes: analysisModes,
          outputLanguage: locale,
        });
        setAiData({ analysis, isAnalyzing: false });
        try {
          const history = await platform.listAnalyses(selected.id);
          setAnalysisHistory(history);
          setSelectedAnalysisId(history[0]?.id || '');
        } catch {
          setAnalysisHistory([]);
          setSelectedAnalysisId('');
        }
        setActiveTab('analysis');
      } catch (error: any) {
        setTranscriptData((current) => ({ ...current, isTranscribing: false, status: error?.message || t('history', 'processingFailed'), error: true }));
      } finally {
        setIsAutoProcessing(false);
      }
    }

    runAutoProcess();
  }, [analysisModes, autoProcess, loadRecordings, locale, selected, t, transcriptionLanguage]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !selected || isAudioLoading || !playbackSource) return;
    stopPronunciationWordSpeech();
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      segmentEndRef.current = null;
      setActiveSegmentKey(null);
      await audio.play();
      setAudioStatus('');
    } catch (error: unknown) {
      setIsPlaying(false);
      setAudioStatus(error instanceof Error ? error.message : t('history', 'audioFailed'));
    }
  };

  const playTranscriptSegment = async (key: string, startSeconds: number, endSeconds: number) => {
    const audio = audioRef.current;
    if (!audio || isAudioLoading || !playbackSource) return;
    stopPronunciationWordSpeech();
    if (activeSegmentKey === key && !audio.paused) {
      audio.pause();
      return;
    }

    const canResume = activeSegmentKey === key
      && audio.currentTime >= startSeconds
      && audio.currentTime < endSeconds;
    if (!canResume) audio.currentTime = startSeconds;
    segmentEndRef.current = endSeconds;
    setActiveSegmentKey(key);
    try {
      await audio.play();
      setAudioStatus('');
    } catch (error: unknown) {
      setActiveSegmentKey(null);
      segmentEndRef.current = null;
      setAudioStatus(error instanceof Error ? error.message : t('history', 'audioFailed'));
    }
  };

  const getDecodedRecordingAudio = async () => {
    if (!playbackSource) throw new Error(t('history', 'segmentDownloadFailed'));
    let decoded = decodedAudioRef.current;
    if (decoded?.source === playbackSource) return decoded.buffer;
    const response = await fetch(playbackSource);
    if (!response.ok) throw new Error(t('history', 'segmentDownloadFailed'));
    const context = new AudioContext();
    try {
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      decoded = { source: playbackSource, buffer };
      decodedAudioRef.current = decoded;
      return buffer;
    } finally {
      await context.close();
    }
  };

  const downloadTranscriptSegment = async (
    key: string,
    speaker: string,
    timestamp: string,
    startSeconds: number,
    endSeconds: number,
  ) => {
    if (!selected || !playbackSource || downloadingSegmentKey) return;
    setDownloadingSegmentKey(key);
    try {
      const decoded = await getDecodedRecordingAudio();
      const blob = createWavSegment(decoded, startSeconds, endSeconds);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const segmentName = safeAudioSegmentName(`${selected.name}-${speaker}-${timestamp || formatDuration(startSeconds * 1000)}`);
      anchor.href = url;
      anchor.download = `${segmentName}.wav`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setAudioStatus('');
    } catch (error: unknown) {
      setAudioStatus(error instanceof Error ? error.message : t('history', 'segmentDownloadFailed'));
    } finally {
      setDownloadingSegmentKey(null);
    }
  };

  const assessTranscriptSegment = async (segment: TranscriptSegment) => {
    if (!selected || assessingSegmentId || transcriptData.language !== 'en-US') return;
    if ((segment.endMs - segment.startMs) > 120_000) {
      setAudioStatus(t('history', 'pronunciationLimit'));
      return;
    }
    if (localStorage.getItem('voxa_pronunciation_consent_v2') !== 'accepted') {
      const accepted = window.confirm(t('history', 'pronunciationConsent'));
      if (!accepted) return;
      localStorage.setItem('voxa_pronunciation_consent_v2', 'accepted');
    }
    setAssessingSegmentId(segment.id);
    setAudioStatus(t('history', 'assessingPronunciation'));
    try {
      const decoded = await getDecodedRecordingAudio();
      const clip = createPronunciationWavSegment(decoded, segment.startMs / 1000, segment.endMs / 1000);
      const assessment = await platform.assessPronunciation({
        recordingId: selected.id,
        segmentId: segment.id,
        audio: await clip.arrayBuffer(),
      });
      setTranscriptData((current) => ({
        ...current,
        segments: current.segments?.map((item) => item.id === segment.id ? { ...item, assessment } : item),
      }));
      setAudioStatus('');
    } catch (error: unknown) {
      setAudioStatus(error instanceof Error ? error.message : t('history', 'pronunciationFailed'));
    } finally {
      setAssessingSegmentId(null);
    }
  };

  const handleTranscribe = async () => {
    if (!selected) return;
    setTranscriptData({ isTranscribing: true, status: t('history', 'transcribingStep') });
    try {
      const result = await platform.transcribe({ recordingId: selected.id, language: transcriptionLanguage, maxQuality: false });
      setTranscriptData({ markdown: result.markdown, language: result.language, segments: result.segments, isTranscribing: false, status: t('history', 'transcriptSaved') });
      await loadRecordings();
    } catch (error: any) {
      setTranscriptData({ isTranscribing: false, status: error?.message || t('history', 'processingFailed'), error: true });
    }
  };

  const handleAnalyze = async () => {
    if (!selected) return;
    setAiData({ isAnalyzing: true, status: t('history', 'analyzingStep') });
    setActiveTab('analysis');
    try {
      const analysis = await platform.analyze({
        recordingId: selected.id,
        modes: analysisModes,
        outputLanguage: locale,
        context: analysisContext,
        selectedSpeakers: detectedSpeakers.length ? selectedSpeakers : undefined,
      });
      setAiData({ analysis, isAnalyzing: false });
      try {
        const history = await platform.listAnalyses(selected.id);
        setAnalysisHistory(history);
        setSelectedAnalysisId(history[0]?.id || '');
      } catch {
        setAnalysisHistory([]);
        setSelectedAnalysisId('');
      }
    } catch (error: any) {
      setAiData({ isAnalyzing: false, status: error?.message || t('history', 'processingFailed'), error: true });
    }
  };

  const handleAnalysisSelection = async (analysisId: string) => {
    if (!selected || analysisId === selectedAnalysisId) return;
    setSelectedAnalysisId(analysisId);
    setPdfStatus('');
    setAiData({ isAnalyzing: true, status: t('history', 'loadingAnalysis') });
    try {
      const analysis = await platform.getAnalysis(selected.id, analysisId);
      setAiData(analysis
        ? { analysis, isAnalyzing: false }
        : { isAnalyzing: false, status: t('history', 'noAnalysis'), error: true });
    } catch (error: any) {
      setAiData({ isAnalyzing: false, status: error?.message || t('history', 'loadFailed'), error: true });
    }
  };

  const toggleSpeaker = (speaker: string) => {
    setSelectedSpeakers((current) => current.includes(speaker)
      ? current.filter((item) => item !== speaker)
      : [...current, speaker]);
  };

  const handleTranscriptionLanguageChange = (nextLanguage: TranscriptionLanguage) => {
    setTranscriptionLanguage(nextLanguage);
    saveTranscriptionLanguage(nextLanguage);
  };

  const handleImportTranscript = async () => {
    const name = importTitle.trim();
    const transcript = importTranscript.trim();
    if (!name || !transcript) return;
    setIsImporting(true);
    setImportStatus('');
    try {
      const conversation = await platform.importTranscript({ name, transcript });
      onImportDialogOpenChange(false);
      setImportTitle('');
      setImportTranscript('');
      await loadRecordings();
      onSelect(conversation.id);
    } catch (error: any) {
      setImportStatus(error?.message || t('history', 'importFailed'));
    } finally {
      setIsImporting(false);
    }
  };

  const toggleAnalysisMode = (mode: AnalysisMode) => {
    setAnalysisModes((current) => {
      const next = current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode];
      const safeNext = next.length > 0 ? next : current;
      localStorage.setItem('voxa_analysis_modes', JSON.stringify(safeNext));
      return safeNext;
    });
  };

  const handleExportPdf = async () => {
    if (!selected || !aiData.analysis) return;
    setIsExportingPdf(true);
    setPdfStatus('');
    try {
      const result = await platform.exportAnalysisPdf({
        analysis: aiData.analysis,
        recording: selected,
        locale,
      });
      setPdfStatus(result?.canceled ? '' : t('history', 'pdfSaved'));
    } catch (error: any) {
      setPdfStatus(error?.message || t('history', 'pdfFailed'));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsDeleting(true);
    try {
      await platform.deleteRecording(selected.id);
      setShowDeleteDialog(false);
      onSelect(null);
      await loadRecordings();
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selected) {
    return (
      <main className="library-view">
        <section className="library-intro">
          <div>
            <h2>{t('library', 'title')}</h2>
            <p>{t('library', 'subtitle')}</p>
          </div>
          <label className="search-field">
            <Search />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('history', 'search')} />
          </label>
        </section>

        {libraryStatus === 'loading' && recordings.length === 0 ? (
          <div className="library-list">
            {[0, 1, 2, 3].map((item) => <div className="library-row skeleton-row" key={item} />)}
          </div>
        ) : libraryStatus === 'error' ? (
          <div className="empty-state library-empty">
            <span className="empty-icon"><RefreshCw /></span>
            <strong>{t('library', 'offlineTitle')}</strong>
            <p>{libraryError || t('library', 'offlineDescription')}</p>
            <button type="button" className="button button-secondary" onClick={onRetry}>{t('common', 'retry')}</button>
          </div>
        ) : recordings.length === 0 ? (
          <div className="empty-state library-empty">
            <span className="empty-icon"><FileAudio /></span>
            <strong>{t('library', 'emptyTitle')}</strong>
            <p>{t('library', 'emptyDescription')}</p>
            <div className="empty-actions"><button type="button" className="button button-primary" onClick={onStartRecording}>{t('navigation', 'newRecording')}</button><button type="button" className="button button-secondary" onClick={() => onImportDialogOpenChange(true)}>{t('history', 'importTranscript')}</button></div>
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="empty-state library-empty">
            <span className="empty-icon"><Search /></span>
            <strong>{t('library', 'noResults')}</strong>
            <p>{t('library', 'noResultsDescription')}</p>
          </div>
        ) : (
          <div className="library-list">
            <div className="library-list-header">
              <span>{t('library', 'conversation')}</span>
              <span>{t('library', 'date')}</span>
              <span>{t('library', 'duration')}</span>
              <span>{t('library', 'status')}</span>
            </div>
            {filteredRecordings.map((recording) => (
              <button key={recording.id} type="button" className="library-row" onClick={() => onSelect(recording.id)}>
                <span className="library-name">
                  <span className="recording-file-icon">{recording.transcript ? <FileText /> : <FileAudio />}</span>
                  <span><strong>{recording.name}</strong><small>{recording.transcript ? t('library', 'transcriptReady') : t('library', 'audioSaved')}</small></span>
                </span>
                <time>{recording.createdAt ? new Date(recording.createdAt).toLocaleDateString(locale) : '—'}</time>
                <span>{recording.hasAudio === false ? '—' : formatDuration(recording.durationMs)}</span>
                <span className={recording.transcript ? 'recording-state is-ready' : 'recording-state'}>{recording.transcript ? t('library', 'ready') : t('library', 'audio')}</span>
              </button>
            ))}
          </div>
        )}
        <AnimatePresence>
          {isImportDialogOpen && (
            <motion.div className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.section className="import-dialog" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 6, opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="import-transcript-title">
                <button type="button" className="icon-button confirm-close" onClick={() => onImportDialogOpenChange(false)} aria-label={t('common', 'close')}><X /></button>
                <span className="import-icon"><FilePlus2 /></span>
                <h3 id="import-transcript-title">{t('history', 'importTitle')}</h3>
                <p>{t('history', 'importDescription')}</p>
                <label><span>{t('history', 'conversationTitle')}</span><input value={importTitle} maxLength={255} onChange={(event) => setImportTitle(event.target.value)} placeholder={t('history', 'conversationTitlePlaceholder')} autoFocus /></label>
                <label><span>{t('history', 'transcript')}</span><textarea value={importTranscript} maxLength={100000} onChange={(event) => setImportTranscript(event.target.value)} placeholder={t('history', 'transcriptPlaceholder')} rows={12} /></label>
                {importStatus && <p className="form-error" role="alert">{importStatus}</p>}
                <div className="confirm-actions"><button type="button" className="button button-secondary" onClick={() => onImportDialogOpenChange(false)}>{t('common', 'cancel')}</button><button type="button" className="button button-primary" onClick={handleImportTranscript} disabled={isImporting || !importTitle.trim() || !importTranscript.trim()}>{isImporting && <Loader2 className="spin" />}{t('history', 'importAction')}</button></div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  const durationSeconds = audioDuration > 0 ? audioDuration : Math.max(0, selected.durationMs / 1000);
  const progress = durationSeconds ? Math.min(100, (currentTime / durationSeconds) * 100) : 0;

  return (
    <main className="detail-view">
      <audio
        ref={audioRef}
        src={playbackSource || undefined}
        preload="metadata"
        onCanPlay={() => setAudioStatus('')}
        onEnded={() => {
          setIsPlaying(false);
          setActiveSegmentKey(null);
          segmentEndRef.current = null;
        }}
        onError={() => playbackSource && setAudioStatus(t('history', 'audioFailed'))}
        onLoadedMetadata={() => {
          const duration = audioRef.current?.duration;
          if (duration && Number.isFinite(duration)) setAudioDuration(duration);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (!audio) return;
          const segmentEnd = segmentEndRef.current;
          if (segmentEnd !== null && audio.currentTime >= segmentEnd) {
            audio.pause();
            audio.currentTime = segmentEnd;
            setActiveSegmentKey(null);
            segmentEndRef.current = null;
          }
          setCurrentTime(audio.currentTime);
        }}
      />

      <header className="detail-header">
        <button type="button" className="back-button" onClick={() => onSelect(null)}><ArrowLeft /> {t('library', 'back')}</button>
        <div className="detail-title-row">
          <div>
            <h2>{selected.name}</h2>
            <div className="detail-meta">
              <span><CalendarDays /> {selected.createdAt ? new Date(selected.createdAt).toLocaleString(locale) : t('library', 'unknownDate')}</span>
              {selected.hasAudio !== false && <span><Clock3 /> {formatDuration(selected.durationMs)}</span>}
              <span><CheckCircle2 /> {selected.transcript ? t('library', 'transcriptReady') : t('library', 'audioSaved')}</span>
            </div>
          </div>
          <button type="button" className="icon-button danger-icon" onClick={() => setShowDeleteDialog(true)} aria-label={t('history', 'deleteRecording')}><Trash2 /></button>
        </div>
      </header>

      {selected.hasAudio !== false && <section className="audio-player">
        <button type="button" className="player-button" onClick={() => void togglePlay()} disabled={isAudioLoading || !playbackSource} aria-label={isPlaying ? t('history', 'pauseAudio') : t('history', 'playAudio')}>
          {isAudioLoading ? <Loader2 className="spin" /> : isPlaying ? <Pause /> : <Play />}
        </button>
        <div className="player-track">
          <div className="player-times"><time>{formatDuration(currentTime * 1000)}</time><time>{formatDuration(durationSeconds * 1000)}</time></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          {audioStatus && <p className="audio-player-status" role="status">{audioStatus}</p>}
        </div>
      </section>}

      {isAutoProcessing && (
        <div className="processing-banner" role="status">
          <Loader2 className="spin" />
          <div><strong>{autoProcessStep}</strong><p>{t('history', 'processingDescription')}</p></div>
        </div>
      )}

      <section className="detail-content">
        <header className="detail-tabs-row">
          <div className="detail-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={activeTab === 'transcript'} className={activeTab === 'transcript' ? 'is-active' : ''} onClick={() => setActiveTab('transcript')}>
              <FileText /> {t('history', 'transcript')}
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'analysis'} className={activeTab === 'analysis' ? 'is-active' : ''} onClick={() => setActiveTab('analysis')}>
              <BrainCircuit /> {t('history', 'aiAnalysis')}
            </button>
          </div>

          {activeTab === 'transcript' ? (selected.hasAudio !== false ? (
            <div className="transcript-toolbar-actions">
              <label className="transcription-language-control">
                <span>{t('common', 'transcriptionLanguage')}</span>
                <select
                  value={transcriptionLanguage}
                  onChange={(event) => handleTranscriptionLanguageChange(event.target.value as TranscriptionLanguage)}
                  disabled={transcriptData.isTranscribing}
                >
                  {TRANSCRIPTION_LANGUAGES.map((item) => (
                    <option value={item} key={item}>{t('common', item === 'pt-BR' ? 'portuguese' : item === 'es' ? 'spanish' : 'english')}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="button button-secondary" onClick={handleTranscribe} disabled={transcriptData.isTranscribing} data-keyboard-primary="true">
                {transcriptData.isTranscribing ? <Loader2 className="spin" /> : <FileText />}
                {transcriptData.markdown ? t('history', 'retranscribe') : t('history', 'transcribeAudio')}
              </button>
            </div>
          ) : null) : transcriptData.markdown ? (
            <div className="analysis-toolbar-actions">
              {aiData.analysis && <button type="button" className="button button-secondary" onClick={handleExportPdf} disabled={isExportingPdf}>
                {isExportingPdf ? <Loader2 className="spin" /> : <Download />}{t('history', 'exportPdf')}
              </button>}
              <button type="button" className="button button-secondary" onClick={handleAnalyze} disabled={aiData.isAnalyzing || (detectedSpeakers.length > 0 && selectedSpeakers.length === 0)} data-keyboard-primary="true">
                {aiData.isAnalyzing ? <Loader2 className="spin" /> : <Sparkles />}
                {aiData.analysis ? t('history', 'reAnalyze') : t('history', 'generateAiReport')}
              </button>
            </div>
          ) : null}
        </header>

        {activeTab === 'analysis' && transcriptData.markdown && (
          <div className="analysis-config-panel">
            {!!analysisHistory.length && (
              <label className="analysis-history-field">
                <span>{t('history', 'analysisHistory')}</span>
                <select
                  value={selectedAnalysisId}
                  onChange={(event) => void handleAnalysisSelection(event.target.value)}
                  disabled={aiData.isAnalyzing}
                >
                  {analysisHistory.map((item, index) => (
                    <option value={item.id} key={item.id}>
                      {new Date(item.createdAt).toLocaleString(locale)}
                      {item.modes.length ? ` · ${item.modes.map((mode) => t('analysisModes', mode)).join(', ')}` : ''}
                      {index === 0 ? ` · ${t('history', 'latestAnalysis')}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div>
              <span className="config-label">{t('history', 'analysisTypes')}</span>
              <div className="analysis-mode-picker">
                {ANALYSIS_MODES.map((mode) => <button key={mode} type="button" className={analysisModes.includes(mode) ? 'is-selected' : ''} onClick={() => toggleAnalysisMode(mode)} aria-pressed={analysisModes.includes(mode)}>{analysisModes.includes(mode) && <Check />}{t('analysisModes', mode)}</button>)}
              </div>
            </div>
            {!!detectedSpeakers.length && <div>
              <div className="config-heading-row"><span className="config-label">{t('history', 'speakersForInsights')}</span><button type="button" onClick={() => setSelectedSpeakers(selectedSpeakers.length === detectedSpeakers.length ? [] : detectedSpeakers)}>{selectedSpeakers.length === detectedSpeakers.length ? t('history', 'clearAll') : t('history', 'selectAll')}</button></div>
              <div className="analysis-mode-picker speaker-picker">{detectedSpeakers.map((speaker) => <button key={speaker} type="button" className={selectedSpeakers.includes(speaker) ? 'is-selected' : ''} onClick={() => toggleSpeaker(speaker)} aria-pressed={selectedSpeakers.includes(speaker)}>{selectedSpeakers.includes(speaker) && <Check />}{speaker}</button>)}</div>
              {selectedSpeakers.length === 0 && <p className="config-error">{t('history', 'selectSpeakerRequired')}</p>}
            </div>}
            <label className="analysis-context-field"><span>{t('history', 'analysisContext')}</span><input value={analysisContext} onChange={(event) => setAnalysisContext(event.target.value)} placeholder={t('history', 'analysisContextPlaceholder')} /></label>
            {pdfStatus && <p className="analysis-export-status">{pdfStatus}</p>}
          </div>
        )}

        <div className="detail-panel">
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === 'transcript' ? (
              <motion.div key="transcript" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {transcriptData.isTranscribing ? (
                  <div className="content-status"><Loader2 className="spin" /><strong>{t('history', 'transcribingStep')}</strong></div>
                ) : transcriptData.markdown ? (
                  <TranscriptDocument
                    markdown={transcriptData.markdown}
                    segments={transcriptData.segments}
                    youLabel={t('history', 'you')}
                    audioAvailable={selected.hasAudio !== false && Boolean(playbackSource)}
                    pronunciationEnabled={transcriptData.language === 'en-US'}
                    durationSeconds={durationSeconds}
                    activeSegmentKey={activeSegmentKey}
                    downloadingSegmentKey={downloadingSegmentKey}
                    assessingSegmentId={assessingSegmentId}
                    isPlaying={isPlaying}
                    playLabel={t('history', 'playSegment')}
                    pauseLabel={t('history', 'pauseSegment')}
                    downloadLabel={t('history', 'downloadSegment')}
                    pronunciationLabel={t('history', 'analyzePronunciation')}
                    pronunciationScoreLabel={t('history', 'pronunciationScore')}
                    pronunciationAccuracyLabel={t('history', 'pronunciationAccuracy')}
                    pronunciationFluencyLabel={t('history', 'pronunciationFluency')}
                    pronunciationCompletenessLabel={t('history', 'pronunciationCompleteness')}
                    pronunciationProsodyLabel={t('history', 'pronunciationProsody')}
                    pronunciationLimitLabel={t('history', 'pronunciationLimit')}
                    possibleFillersLabel={t('history', 'possibleFillers')}
                    possibleFillersHint={t('history', 'possibleFillersHint')}
                    pronunciationWordLabels={{
                      details: t('history', 'pronunciationWordDetails'),
                      score: t('history', 'pronunciationWordScore'),
                      error: t('history', 'pronunciationWordError'),
                      weakPhonemes: t('history', 'weakPhonemes'),
                      listenOriginal: t('history', 'listenOriginalWord'),
                      pauseOriginal: t('history', 'pauseOriginalWord'),
                      listenCorrect: t('history', 'listenCorrectWord'),
                      stopCorrect: t('history', 'stopCorrectWord'),
                      originalUnavailable: t('history', 'originalWordUnavailable'),
                      correctUnavailable: t('history', 'correctWordUnavailable'),
                    }}
                    correctPronunciationAvailable={pronunciationVoice !== null}
                    speakingPronunciationWordKey={speakingPronunciationWordKey}
                    onPlaySegment={(key, start, end) => void playTranscriptSegment(key, start, end)}
                    onPlayPronunciationWord={(key, start, end) => void playTranscriptSegment(key, start, end)}
                    onSpeakPronunciationWord={speakPronunciationWord}
                    onDownloadSegment={(key, speaker, timestamp, start, end) => void downloadTranscriptSegment(key, speaker, timestamp, start, end)}
                    onAssessPronunciation={(segment) => void assessTranscriptSegment(segment)}
                  />
                ) : (
                  <div className={transcriptData.error ? 'content-status is-error' : 'content-status'}>
                    <FileText /><strong>{transcriptData.status || t('history', 'noTranscript')}</strong>
                    <p>{t('history', 'transcriptEmptyDescription')}</p>
                    <button type="button" className="button button-secondary" onClick={handleTranscribe}>{t('history', 'transcribeAudio')}</button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {aiData.isAnalyzing ? (
                  <div className="content-status"><Loader2 className="spin" /><strong>{aiData.status || t('history', 'analyzingStep')}</strong></div>
                ) : aiData.analysis ? (
                  <AIAnalysis
                    analysis={aiData.analysis}
                    grammarAudioEnabled={transcriptData.language === 'en-US'}
                    transcriptSegments={transcriptData.segments}
                    audioAvailable={selected.hasAudio !== false && Boolean(playbackSource)}
                    activeAudioSegmentKey={activeSegmentKey}
                    isAudioPlaying={isPlaying}
                    onPlayAudioSegment={(key, start, end) => void playTranscriptSegment(key, start, end)}
                    onPauseRecordingAudio={() => audioRef.current?.pause()}
                  />
                ) : (
                  <div className={aiData.error ? 'content-status is-error' : 'content-status'}>
                    <Sparkles /><strong>{aiData.status || t('history', 'readyForAnalysis')}</strong>
                    <p>{transcriptData.markdown ? t('history', 'analysisEmptyDescription') : t('history', 'transcriptRequired')}</p>
                    {transcriptData.markdown && <button type="button" className="button button-secondary" onClick={handleAnalyze} disabled={detectedSpeakers.length > 0 && selectedSpeakers.length === 0}>{t('history', 'generateAiReport')}</button>}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div className="modal-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="confirm-dialog" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 6, opacity: 0 }} role="alertdialog" aria-modal="true">
              <button type="button" className="icon-button confirm-close" onClick={() => setShowDeleteDialog(false)} aria-label={t('common', 'close')} data-keyboard-cancel="true"><X /></button>
              <span className="confirm-icon"><Trash2 /></span>
              <h3>{t('history', 'deleteTitle')}</h3>
              <p>{t('history', 'deleteConfirm')}</p>
              <div className="confirm-actions">
                <button type="button" className="button button-secondary" onClick={() => setShowDeleteDialog(false)}>{t('common', 'cancel')}</button>
                <button type="button" className="button button-danger" onClick={handleDelete} disabled={isDeleting}>{isDeleting && <Loader2 className="spin" />}{t('common', 'delete')}</button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
