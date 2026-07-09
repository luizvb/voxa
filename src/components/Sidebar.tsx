import { Home, History } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { id: 'home', icon: Home, label: 'Home', color: 'text-orange-500', bg: 'bg-orange-500/20' },
  { id: 'history', icon: History, label: 'History', color: 'text-purple-500', bg: 'bg-purple-500/20' },
];

export default function Sidebar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
  return (
    <div className="flex flex-col h-full text-sm font-medium p-4 no-drag space-y-1">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={clsx(
            "flex items-center gap-3 w-full px-3 py-2 rounded-xl transition-all duration-200",
            activeTab === item.id 
              ? "bg-[#2A2A2A] text-white" 
              : "text-gray-400 hover:bg-[#2A2A2A]/50 hover:text-white"
          )}
        >
          <div className={clsx("p-1.5 rounded-lg", item.bg)}>
            <item.icon className={clsx("w-4 h-4", item.color)} strokeWidth={2.5} />
          </div>
          {item.label}
        </button>
      ))}

      <div className="mt-auto pb-4">
        <div className="px-3 pb-2 text-[11px] text-gray-500 text-center">
          13 minutes of Pro usage left
        </div>
        <button className="w-full h-12 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-between px-4 hover:bg-white/5 transition-colors">
          <span className="font-semibold text-white/90">VoiceDesk</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70">Pro</span>
        </button>
      </div>
    </div>
  );
}
