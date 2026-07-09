import { useState, useEffect, useRef } from 'react';
import { Play, Pause, FileText, Loader2, HardDrive, Clock, Search, Trash2, BrainCircuit } from 'lucide-react';
import AIAnalysis from './AIAnalysis';
import clsx from 'clsx';

export default function HistoryView() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Transcript state
  const [transcriptData, setTranscriptData] = useState<{markdown?: string, status?: string, isTranscribing: boolean}>({ isTranscribing: false });
  
  // AI Analysis state
  const [aiData, setAiData] = useState<{analysis?: any, status?: string, isAnalyzing: boolean}>({ isAnalyzing: false });
  const [activeTab, setActiveTab] = useState<'transcript' | 'analysis'>('transcript');
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const data = await window.recorder.listRecordings();
      setRecordings(data);
      if (data.length > 0 && !selectedId) {
        handleSelect(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  const selected = recordings.find(r => r.id === selectedId);

  const handleSelect = async (rec: any) => {
    setSelectedId(rec.id);
    setIsPlaying(false);
    setCurrentTime(0);
    setTranscriptData({ isTranscribing: false });
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = rec.playbackUrl;
    }

    if (rec.transcript) {
      try {
        const result = await window.recorder.getTranscript(rec.id);
        setTranscriptData({ markdown: result.markdown, isTranscribing: false, status: `Saved (${rec.transcript.quality})` });
        
        // Also load analysis if it exists
        const analysis = await window.recorder.getAnalysis(rec.id);
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
      loadRecordings(); // Refresh list to show transcript badge
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
    if (confirm('Are you sure you want to delete this recording?')) {
      try {
        await window.recorder.deleteRecording(selected.id);
        setSelectedId(null);
        setTranscriptData({ isTranscribing: false });
        loadRecordings();
      } catch (e) {
        console.error('Failed to delete recording', e);
        alert('Failed to delete recording.');
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-6">
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)} 
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)} 
        className="hidden" 
      />

      {/* List Column */}
      <div className={clsx(
        "w-full md:w-[300px] flex flex-col gap-4 md:border-r border-white/10 md:pr-6",
        selected ? "h-[30vh] md:h-full border-b md:border-b-0 pb-4 md:pb-0" : "h-full"
      )}>
        <h2 className="text-xl font-semibold text-white/90">History</h2>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/40" />
          <input 
            type="text" 
            placeholder="Search recordings..." 
            className="w-full h-9 pl-9 pr-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="text-white/40 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : recordings.length === 0 ? (
            <div className="text-white/40 text-sm">No recordings found.</div>
          ) : (
            recordings.map((rec) => (
              <button
                key={rec.id}
                onClick={() => handleSelect(rec)}
                className={clsx(
                  "w-full text-left p-3 rounded-xl border transition-colors",
                  selectedId === rec.id 
                    ? "bg-[#1A1A1A] border-white/20 shadow-sm" 
                    : "border-transparent hover:bg-white/5"
                )}
              >
                <div className="font-medium text-white/90 text-sm mb-1 truncate">{rec.name}</div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {formatDuration(rec.durationMs)}</span>
                  <span>•</span>
                  <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                </div>
                {rec.transcript && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Transcribed
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Details Column */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            <div className="mb-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white/90">{selected.name}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(selected.createdAt).toLocaleString()}</span>
                  <span className="flex items-center gap-1.5"><HardDrive className="w-4 h-4" /> Local Storage</span>
                </div>
              </div>
              <button 
                onClick={handleDelete}
                className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Delete recording"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Audio Player Card */}
            <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 flex items-center gap-4 mb-6">
              <button 
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
              </button>
              
              <div className="flex-1">
                <div className="flex justify-between text-xs font-mono text-white/50 mb-2">
                  <span>{formatDuration(currentTime * 1000)}</span>
                  <span>{formatDuration(selected.durationMs)}</span>
                </div>
                {/* Progress bar mock */}
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(currentTime / (selected.durationMs / 1000)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Transcript / AI Analysis Card */}
            <div className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#202020]">
                
                <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
                  <button 
                    onClick={() => setActiveTab('transcript')}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      activeTab === 'transcript' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                    )}
                  >
                    <FileText className="w-4 h-4" /> Transcript
                  </button>
                  <button 
                    onClick={() => setActiveTab('analysis')}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      activeTab === 'analysis' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                    )}
                  >
                    <BrainCircuit className="w-4 h-4" /> AI Analysis
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {activeTab === 'transcript' ? (
                    <>
                      {!transcriptData.isTranscribing && (
                        <button 
                          onClick={handleTranscribe}
                          className={clsx(
                            "px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                            transcriptData.markdown 
                              ? "bg-white/10 text-white hover:bg-white/20" 
                              : "bg-white text-black hover:bg-white/90"
                          )}
                        >
                          {transcriptData.markdown ? "Retranscribe" : "Transcribe Audio"}
                        </button>
                      )}
                      {transcriptData.isTranscribing && (
                        <div className="text-xs text-blue-400 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {!aiData.isAnalyzing && transcriptData.markdown && (
                        <button 
                          onClick={handleAnalyze}
                          className={clsx(
                            "px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2",
                            aiData.analysis 
                              ? "bg-white/10 text-white hover:bg-white/20" 
                              : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 shadow-lg"
                          )}
                        >
                          {aiData.analysis ? "Re-analyze" : "Generate AI Report ✨"}
                        </button>
                      )}
                      {aiData.isAnalyzing && (
                        <div className="text-xs text-purple-400 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'transcript' ? (
                  transcriptData.markdown ? (
                    <div className="text-white/80 text-[15px] leading-relaxed max-w-4xl mx-auto w-full flex flex-col space-y-6">
                      {transcriptData.markdown.split(/(?:\r?\n){2,}/).map((block, i) => {
                        const parts = block.split(/\r?\n/).filter(line => line.trim().length > 0);
                        if (parts.length === 0) return null;
                        
                        if (parts.length === 1) {
                          return (
                            <div key={i} className="flex w-full justify-center">
                              <div className="bg-white/5 text-white/40 text-xs px-3 py-1.5 rounded-full">
                                {parts[0]}
                              </div>
                            </div>
                          );
                        }
                        
                        const [heading, ...body] = parts;
                        const rawHeading = heading.replace(/\*\*/g, '').trim();
                        const isSelf = rawHeading.includes('Speaker 0');
                        
                        return (
                          <div key={i} className={clsx("flex w-full", isSelf ? "justify-end" : "justify-start")}>
                            <div className={clsx(
                              "max-w-[80%] md:max-w-[70%] rounded-2xl p-4 shadow-sm",
                              isSelf 
                                ? "bg-orange-500/10 border border-orange-500/20 text-orange-50 rounded-tr-sm" 
                                : "bg-[#262626] border border-white/5 text-white/90 rounded-tl-sm"
                            )}>
                              <div className={clsx(
                                "text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between gap-4",
                                isSelf ? "text-orange-400/80" : "text-white/40"
                              )}>
                                <span>{isSelf ? 'You' : rawHeading.split('(')[0].trim()}</span>
                                <span className="opacity-60 font-mono tracking-normal">{rawHeading.match(/\((.*?)\)/)?.[1]}</span>
                              </div>
                              <div className="text-[14px] leading-relaxed">
                                {body.join(' ').trim()}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm">
                      {transcriptData.status || "Click transcribe to generate text from audio."}
                    </div>
                  )
                ) : (
                  // AI Analysis Tab
                  aiData.analysis ? (
                    <AIAnalysis analysis={aiData.analysis} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm">
                      {aiData.status || (transcriptData.markdown ? "Ready to generate AI report." : "Transcript required before analysis.")}
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30">
            Select a recording to view details
          </div>
        )}
      </div>
    </div>
  );
}
