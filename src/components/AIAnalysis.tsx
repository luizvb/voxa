import { useState } from 'react';
import { Target, MessageCircle, BarChart3, TrendingUp, CheckCircle, BrainCircuit, Activity } from 'lucide-react';
import clsx from 'clsx';

interface AIAnalysisProps {
  analysis: any;
}

export default function AIAnalysis({ analysis }: AIAnalysisProps) {
  if (!analysis || !analysis.speakers || analysis.speakers.length === 0) {
    return <div className="p-8 text-center text-white/50">No analysis data available.</div>;
  }

  const [activeSpeaker, setActiveSpeaker] = useState(analysis.speakers[0].id);

  const speaker = analysis.speakers.find((s: any) => s.id === activeSpeaker) || analysis.speakers[0];

  const getLevelColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'A1':
      case 'A2': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'B1': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'B2': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'C1':
      case 'C2': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto w-full pb-12">
      {/* Summary Card */}
      <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
          <Target className="w-4 h-4" /> Conversation Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-white/30 mb-1 uppercase font-bold tracking-wider">Primary Intent</div>
            <p className="text-white/90 text-sm leading-relaxed">{analysis.summary?.intent}</p>
          </div>
          <div>
            <div className="text-xs text-white/30 mb-1 uppercase font-bold tracking-wider">Summary</div>
            <p className="text-white/80 text-sm leading-relaxed">{analysis.summary?.overview}</p>
          </div>
        </div>
      </div>

      {/* Speaker Selector */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        {analysis.speakers.map((s: any) => (
          <button
            key={s.id}
            onClick={() => setActiveSpeaker(s.id)}
            className={clsx(
              "px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300",
              activeSpeaker === s.id
                ? "bg-white text-black shadow-lg scale-105"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            {s.id}
          </button>
        ))}
      </div>

      {/* Speaker Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Proficiency Radar */}
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">CEFR Level</div>
            <div className={clsx("w-32 h-32 rounded-full flex items-center justify-center border-4 text-5xl font-black shadow-2xl", getLevelColor(speaker.proficiency?.level))}>
              {speaker.proficiency?.level || '?'}
            </div>
          </div>

          <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4" /> Behavioral NLP
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              {speaker.nlp}
            </p>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Proficiency Breakdown
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-white/30"><Activity className="w-3 h-3"/> Range (Vocab)</div>
                <p className="text-white/80 text-sm leading-relaxed">{speaker.proficiency?.range}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-white/30"><CheckCircle className="w-3 h-3"/> Accuracy</div>
                <p className="text-white/80 text-sm leading-relaxed">{speaker.proficiency?.accuracy}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-white/30"><TrendingUp className="w-3 h-3"/> Fluency</div>
                <p className="text-white/80 text-sm leading-relaxed">{speaker.proficiency?.fluency}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-white/30"><MessageCircle className="w-3 h-3"/> Interaction</div>
                <p className="text-white/80 text-sm leading-relaxed">{speaker.proficiency?.interaction}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-2">
              Actionable Feedback
            </h3>
            <p className="text-white/90 text-sm leading-relaxed">
              {speaker.feedback}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
