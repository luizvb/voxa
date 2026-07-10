import { useState, useEffect, useRef } from 'react';
import { Play, Pause, FileText, Loader2, HardDrive, Clock, Trash2, BrainCircuit } from 'lucide-react';
import AIAnalysis from './AIAnalysis';
import clsx from 'clsx';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface HistoryViewProps {
  recordings: any[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  loadRecordings: () => Promise<void>;
  autoProcess?: boolean;
}

export default function HistoryView({ recordings, selectedId, onSelect, loadRecordings, autoProcess }: HistoryViewProps) {
  const { t } = useLanguage();

  // Transcript state
  const [transcriptData, setTranscriptData] = useState<{markdown?: string, status?: string, isTranscribing: boolean}>({ isTranscribing: false });

  // AI Analysis state
  const [aiData, setAiData] = useState<{analysis?: any, status?: string, isAnalyzing: boolean}>({ isAnalyzing: false });
  const [activeTab, setActiveTab] = useState<'transcript' | 'analysis'>('transcript');

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selected = recordings.find(r => r.id === selectedId);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [autoProcessStep, setAutoProcessStep] = useState('');

  useEffect(() => {
    const runAutoProcess = async () => {
      if (autoProcess && selected && !selected.transcript && !transcriptData.isTranscribing && !isAutoProcessing) {
        setIsAutoProcessing(true);
        setAutoProcessStep('Transcribing your audio...');
        try {
          const result = await window.recorder.transcribeWithDeepgram({
            recordingId: selected.id,
            maxQuality: false
          });
          setTranscriptData({
            markdown: result.markdown,
            isTranscribing: false,
            status: `Transcript saved`
          });
          await loadRecordings();
          
          setAutoProcessStep('Generating AI insights...');
          const aiResult = await window.recorder.analyzeWithLLM(selected.id);
          setAiData({ analysis: aiResult, isAnalyzing: false });
          setActiveTab('analysis');
        } catch (e: any) {
          console.error('Auto process failed:', e);
        } finally {
          setIsAutoProcessing(false);
        }
      }
    };
    runAutoProcess();
  }, [autoProcess, selected]);

  useEffect(() => {
    const handleSelect = async () => {
      if (!selected) return;

      setIsPlaying(false);
      setCurrentTime(0);
      setTranscriptData({ isTranscribing: false });

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = selected.playbackUrl;
      }

      if (selected.transcript) {
        try {
          const result = await window.recorder.getTranscript(selected.id);
          setTranscriptData({ markdown: result.markdown, isTranscribing: false, status: `Saved (${selected.transcript.quality})` });

          const analysis = await window.recorder.getAnalysis(selected.id);
          if (analysis) {
            setAiData({ analysis, isAnalyzing: false });
          } else {
            setAiData({ isAnalyzing: false, status: 'No AI analysis yet' });
          }
        } catch (e: any) {
          setTranscriptData({ status: 'Error loading transcript: ' + e.message, isTranscribing: false });
        }
      } else {
        setTranscriptData({ status: 'No transcript yet', isTranscribing: false });
        setAiData({ isAnalyzing: false, status: 'Transcript required for analysis' });
      }
    };

    handleSelect();
  }, [selectedId, selected]);

  const togglePlay = () => {
    if (!audioRef.current || !selected) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleTranscribe = async () => {
    if (!selected) return;
    setTranscriptData({ isTranscribing: true, status: 'Transcribing via Deepgram...' });

    try {
      const result = await window.recorder.transcribeWithDeepgram({
        recordingId: selected.id,
        maxQuality: false
      });
      setTranscriptData({
        markdown: result.markdown,
        isTranscribing: false,
        status: `Transcript saved`
      });
      loadRecordings();
    } catch (e: any) {
      setTranscriptData({ isTranscribing: false, status: `Failed: ${e.message}` });
    }
  };

  const handleAnalyze = async () => {
    if (!selected) return;
    setAiData({ isAnalyzing: true, status: 'Analyzing with OpenRouter...' });
    setActiveTab('analysis');

    try {
      const result = await window.recorder.analyzeWithLLM(selected.id);
      setAiData({ analysis: result, isAnalyzing: false });
    } catch (e: any) {
      setAiData({ isAnalyzing: false, status: `Failed: ${e.message}` });
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (confirm(t('history', 'deleteConfirm') || 'Are you sure you want to delete this recording?')) {
      try {
        await window.recorder.deleteRecording(selected.id);
        onSelect(null);
        loadRecordings();
      } catch (e) {
        console.error('Failed to delete recording', e);
        alert(t('history', 'deleteFailed') || 'Failed to delete recording');
      }
    }
  };

  if (!selected) {
    return (
      <div className="h-full flex items-center justify-center text-white/30">
        {t('history', 'selectRecording') || 'Select a recording from the sidebar to view details.'}
      </div>
    );
  }

  return (
    <motion.div
      key={selected.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full gap-6 max-w-5xl mx-auto w-full relative"
    >
      <AnimatePresence>
        {isAutoProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#121212]/80 backdrop-blur-md flex flex-col items-center justify-center rounded-3xl border border-white/5 shadow-2xl"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <Loader2 className="w-16 h-16 text-primary animate-spin mb-6 relative z-10" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{autoProcessStep}</h3>
            <p className="text-sm text-white/50 max-w-sm text-center">
              Please wait while our AI processes your conversation to extract valuable insights.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        className="hidden"
      />

      {/* Header */}
      <div className="mb-2 flex flex-wrap gap-3 items-start">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white/90 break-anywhere">{selected.name}</h2>
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-white/50">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(selected.createdAt).toLocaleString()}</span>
            <span className="flex items-center gap-1.5"><HardDrive className="w-4 h-4" /> {t('history', 'localStorage') || 'Local Storage'}</span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors"
          title="Delete recording"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Audio Player Card */}
      <div className="bg-transparent border-b border-white-[0.03] pb-6 flex items-center gap-4 sm:gap-6">
        <button
          onClick={togglePlay}
          className="w-12 h-12 shrink-0 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
        </button>

        <div className="flex-1">
          <div className="flex justify-between text-[10px] tracking-widest font-mono text-white/30 mb-2 uppercase">
            <span>{formatDuration(currentTime * 1000)}</span>
            <span>{formatDuration(selected.durationMs)}</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white/80 rounded-full"
              style={{ width: `${(currentTime / (selected.durationMs / 1000)) * 100}%` }}
              layout
            />
          </div>
        </div>
      </div>

      {/* Transcript / AI Analysis Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="pb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">

          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('transcript')}
              className={clsx(
                "pb-2 text-[11px] font-bold tracking-[0.2em] uppercase transition-all relative",
                activeTab === 'transcript' ? "text-white" : "text-white/30 hover:text-white/60"
              )}
            >
              {t('history', 'transcript') || 'Transcript'}
              {activeTab === 'transcript' && (
                <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-px bg-white" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={clsx(
                "pb-2 text-[11px] font-bold tracking-[0.2em] uppercase transition-all relative",
                activeTab === 'analysis' ? "text-white" : "text-white/30 hover:text-white/60"
              )}
            >
              {t('history', 'aiAnalysis') || 'AI Analysis'}
              {activeTab === 'analysis' && (
                <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-px bg-white" />
              )}
            </button>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {activeTab === 'transcript' ? (
              <>
                {!transcriptData.isTranscribing && (
                  <button
                    onClick={handleTranscribe}
                    data-keyboard-primary="true"
                    className={clsx(
                      "px-5 py-2 text-xs font-semibold rounded-xl transition-all hover:scale-105 active:scale-95",
                      transcriptData.markdown
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-white text-black hover:bg-white/90 shadow-lg"
                    )}
                  >
                    {transcriptData.markdown ? (t('history', 'retranscribe') || 'Retranscribe') : (t('history', 'transcribeAudio') || 'Transcribe Audio')}
                  </button>
                )}
                {transcriptData.isTranscribing && (
                  <div className="text-xs text-blue-400 flex items-center gap-2 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t('history', 'processing') || 'Processing...'}
                  </div>
                )}
              </>
            ) : (
              <>
                {!aiData.isAnalyzing && transcriptData.markdown && (
                  <button
                    onClick={handleAnalyze}
                    data-keyboard-primary="true"
                    className={clsx(
                      "px-5 py-2 text-xs font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2",
                      aiData.analysis
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                    )}
                  >
                    {aiData.analysis ? (t('history', 'reAnalyze') || 'Re-analyze') : (t('history', 'generateAiReport') || 'Generate AI Report')}
                  </button>
                )}
                {aiData.isAnalyzing && (
                  <div className="text-xs text-purple-400 flex items-center gap-2 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t('history', 'thinking') || 'Thinking...'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative bg-gradient-to-b from-[#1A1A1A] to-[#121212]">
          <AnimatePresence mode="wait">
            {activeTab === 'transcript' ? (
              <motion.div
                key="transcript-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {transcriptData.markdown ? (
                  <div className="text-white/80 text-[15px] leading-relaxed max-w-4xl mx-auto w-full flex flex-col space-y-8">
                    {transcriptData.markdown.split(/(?:\r?\n){2,}/).map((block, i) => {
                      const parts = block.split(/\r?\n/).filter(line => line.trim().length > 0);
                      if (parts.length === 0) return null;

                      if (parts.length === 1) {
                        return (
                          <div key={i} className="flex w-full justify-center my-6">
                            <div className="bg-white/5 text-white/40 text-xs px-4 py-2 rounded-full border border-white/10 shadow-sm font-medium tracking-wide">
                              {parts[0]}
                            </div>
                          </div>
                        );
                      }

                      const [heading, ...body] = parts;
                      const rawHeading = heading.replace(/\*\*/g, '').trim();
                      const isSelf = rawHeading.includes('Speaker 0');

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 0.5) }}
                          key={i}
                          className={clsx("flex w-full", isSelf ? "justify-end" : "justify-start")}
                        >
                          <div className={clsx(
                            "max-w-[85%] md:max-w-[75%] rounded-3xl p-5 shadow-md",
                            isSelf
                              ? "bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 text-orange-50 rounded-tr-sm"
                              : "bg-gradient-to-br from-[#262626] to-[#1E1E1E] border border-white/5 text-white/90 rounded-tl-sm"
                          )}>
                            <div className={clsx(
                              "text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-between gap-2 flex-wrap",
                              isSelf ? "text-orange-400/80" : "text-white/40"
                            )}>
                              <span>{isSelf ? (t('history', 'you') || 'You') : rawHeading.split('(')[0].trim()}</span>
                              <span className="opacity-50 font-mono tracking-normal">{rawHeading.match(/\((.*?)\)/)?.[1]}</span>
                            </div>
                            <div className="text-[15px] leading-relaxed break-anywhere">
                              {body.join(' ').trim()}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm">
                    {transcriptData.status || (t('history', 'noTranscript') || 'No transcript yet.')}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="analysis-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {aiData.analysis ? (
                  <AIAnalysis analysis={aiData.analysis} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm">
                    {aiData.status || (transcriptData.markdown ? "Ready to generate AI report." : "Transcript required before analysis.")}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
