import { HelpCircle, Settings, Command, MousePointer2, Sparkles, Book, Mic } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import clsx from 'clsx';
import { useEffect } from 'react';

export default function Dashboard() {
  const { isRecording, status, formattedTime, startRecording, stopRecording } = useRecorder();

  useEffect(() => {
    const handleShortcut = () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    window.recorder.onShortcutRecord(handleShortcut);
    return () => {
      window.recorder.removeShortcutRecord(handleShortcut);
    };
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="max-w-4xl mx-auto text-[#E2E8F0] space-y-10">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white/90">MacBook Pro Microphone (Default)</h2>
      </div>

      {/* Metrics Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[15px] font-semibold text-white/80">All time</h3>
          <HelpCircle className="w-4 h-4 text-white/40" />
        </div>

        <div className="grid grid-cols-4 gap-6 bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
          <div>
            <div className="text-2xl font-bold text-white">56 WPM</div>
            <div className="text-sm text-white/40 font-medium mt-1">Average speed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">60</div>
            <div className="text-sm text-white/40 font-medium mt-1">Words</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">2</div>
            <div className="text-sm text-white/40 font-medium mt-1">Apps used</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">0 minutes</div>
            <div className="flex items-center gap-1.5 text-sm text-white/40 font-medium mt-1">
              Saved all time
              <Settings className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section>
        <h3 className="text-[15px] font-semibold text-white/80 mb-4">Get started</h3>
        
        <div className="space-y-1">
          {/* Action 1: Recording */}
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className="w-full flex items-start gap-4 p-4 rounded-xl hover:bg-[#1A1A1A] transition-colors text-left group"
          >
            <div className={clsx(
              "mt-1 w-6 h-6 rounded-full flex items-center justify-center transition-colors",
              isRecording ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-white/10 text-white/60 group-hover:text-white"
            )}>
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white/90 text-[15px] flex items-center gap-2">
                {isRecording ? 'Stop recording' : 'Start recording'}
                {isRecording && <span className="font-mono text-red-400 text-xs px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">{formattedTime}</span>}
              </div>
              <div className="text-sm text-white/50 mt-0.5">
                {isRecording ? status : 'Turn your voice to text with a single click.'}
              </div>
            </div>
            <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
              <kbd className="h-6 px-1.5 rounded bg-white/10 text-xs font-sans flex items-center justify-center border border-white/5">
                <Command className="w-3 h-3" />
              </kbd>
              <kbd className="h-6 px-2 rounded bg-white/10 text-xs font-sans flex items-center justify-center border border-white/5">
                Shift
              </kbd>
              <kbd className="h-6 px-2 rounded bg-white/10 text-xs font-sans flex items-center justify-center border border-white/5">
                R
              </kbd>
            </div>
          </button>

          {/* Action 2: Shortcuts */}
          <button className="w-full flex items-start gap-4 p-4 rounded-xl hover:bg-[#1A1A1A] transition-colors text-left group">
            <div className="mt-1 w-6 h-6 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <MousePointer2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white/90 text-[15px]">Customize your shortcuts</div>
              <div className="text-sm text-white/50 mt-0.5">Change the keyboard shortcuts for Voxa.</div>
            </div>
          </button>

          {/* Action 3: Mode */}
          <button className="w-full flex items-start gap-4 p-4 rounded-xl hover:bg-[#1A1A1A] transition-colors text-left group">
            <div className="mt-1 w-6 h-6 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white/90 text-[15px]">Create a mode</div>
              <div className="text-sm text-white/50 mt-0.5">Build the perfect mode for your workflow.</div>
            </div>
          </button>

          {/* Action 4: Vocabulary */}
          <button className="w-full flex items-start gap-4 p-4 rounded-xl hover:bg-[#1A1A1A] transition-colors text-left group">
            <div className="mt-1 w-6 h-6 flex items-center justify-center text-white/40 group-hover:text-white transition-colors">
              <Book className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white/90 text-[15px]">Add vocabulary</div>
              <div className="text-sm text-white/50 mt-0.5">Teach Voxa custom words, names, or industry terms.</div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}
