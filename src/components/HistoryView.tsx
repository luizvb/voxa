import { useState, useEffect, useRef } from 'react';
import { Play, Pause, FileText, Loader2, HardDrive, Clock, Search } from 'lucide-react';
import clsx from 'clsx';

export default function HistoryView() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Transcript state
  const [transcriptData, setTranscriptData] = useState<{markdown?: string, status?: string, isTranscribing: boolean}>({ isTranscribing: false });
  
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
      } catch (e: any) {
        setTranscriptData({ status: 'Error loading transcript: ' + e.message, isTranscribing: false });
      }
    } else {
      setTranscriptData({ status: 'No transcript yet', isTranscribing: false });
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

  return (
    <div className="flex h-full gap-6">
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)} 
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)} 
        className="hidden" 
      />

      {/* List Column */}
      <div className="w-[300px] flex flex-col gap-4 border-r border-white/10 pr-6">
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
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white/90">{selected.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-white/50">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(selected.createdAt).toLocaleString()}</span>
                <span className="flex items-center gap-1.5"><HardDrive className="w-4 h-4" /> Local Storage</span>
              </div>
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

            {/* Transcript Card */}
            <div className="flex-1 bg-[#1A1A1A] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#202020]">
                <div className="flex items-center gap-2 font-medium text-white/80">
                  <FileText className="w-4 h-4" /> Transcript
                </div>
                {!transcriptData.markdown && !transcriptData.isTranscribing && (
                  <button 
                    onClick={handleTranscribe}
                    className="px-4 py-1.5 text-xs font-semibold bg-white text-black rounded-lg hover:bg-white/90 transition-colors"
                  >
                    Transcribe Audio
                  </button>
                )}
                {transcriptData.isTranscribing && (
                  <div className="text-xs text-blue-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {transcriptData.markdown ? (
                  <div className="text-white/80 text-[15px] leading-relaxed max-w-3xl whitespace-pre-wrap">
                    {transcriptData.markdown.split(/(?:\r?\n){2,}/).map((block, i) => {
                      const parts = block.split(/\r?\n/).filter(line => line.trim().length > 0);
                      if (parts.length === 0) return null;
                      
                      if (parts.length === 1) {
                        return (
                          <div key={i} className="mb-6">
                            {parts[0]}
                          </div>
                        );
                      }
                      
                      const [heading, ...body] = parts;
                      return (
                        <div key={i} className="mb-6">
                          <div className="text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                            {heading.replace(/\*\*/g, '')}
                          </div>
                          <div>
                            {body.join(' ').trim()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-white/30 text-sm">
                    {transcriptData.status || "Click transcribe to generate text from audio."}
                  </div>
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
