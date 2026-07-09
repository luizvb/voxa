import { Home, History, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import clsx from 'clsx';
import { Logo } from './Logo';

const navItems = [
  { id: 'home', icon: Home, label: 'Home', color: 'text-orange-500', bg: 'bg-orange-500/20' },
  { id: 'history', icon: History, label: 'History', color: 'text-purple-500', bg: 'bg-purple-500/20' },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ activeTab, onTabChange, collapsed, onToggle }: SidebarProps) {
  return (
    <div className="flex flex-col h-full text-sm font-medium p-4 no-drag space-y-1 relative">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        {!collapsed && <span className="font-bold text-white/50 uppercase tracking-widest text-xs hidden md:block">Menu</span>}
        <button 
          onClick={onToggle} 
          className={clsx(
            "p-1.5 hover:bg-white/10 rounded-md text-white/50 hidden md:block", 
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={clsx(
            "flex items-center w-full py-2 rounded-xl transition-all duration-200",
            collapsed ? "justify-center px-0" : "gap-3 px-3",
            activeTab === item.id 
              ? "bg-[#2A2A2A] text-white" 
              : "text-gray-400 hover:bg-[#2A2A2A]/50 hover:text-white"
          )}
          title={collapsed ? item.label : undefined}
        >
          <div className={clsx("p-1.5 rounded-lg flex-shrink-0", item.bg)}>
            <item.icon className={clsx("w-4 h-4", item.color)} strokeWidth={2.5} />
          </div>
          {!collapsed && <span className="truncate">{item.label}</span>}
        </button>
      ))}

      <div className="mt-auto pb-4">
        {!collapsed && (
          <div className="px-3 pb-2 text-[11px] text-gray-500 text-center">
            13 min Pro left
          </div>
        )}
        <button className={clsx(
          "w-full h-12 rounded-2xl glass flex items-center hover:bg-white/5 transition-colors group",
          collapsed ? "justify-center px-0" : "justify-between px-3"
        )}>
          <div className="flex items-center gap-2">
            <Logo className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {!collapsed && <span className="font-semibold text-gradient">Voxa</span>}
          </div>
          {!collapsed && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20 shadow-[0_0_10px_rgba(0,229,255,0.2)]">Pro</span>}
        </button>
      </div>
    </div>
  );
}
