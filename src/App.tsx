import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import HistoryView from './components/HistoryView';
import clsx from 'clsx';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col drag-region">
        <div className="flex-1 flex items-center justify-center no-drag">
          <Login onLogin={() => setIsAuthenticated(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden text-foreground">
      {/* Sidebar Area */}
      <div className={clsx(
        "flex-shrink-0 bg-[#1e1e1e]/50 border-r border-white/10 flex flex-col pt-10 drag-region transition-all duration-300 z-50",
        isSidebarOpen ? "w-[240px]" : "w-[72px]",
        "absolute md:relative h-full",
        !isSidebarOpen && "w-0 md:w-[72px] overflow-hidden" 
      )}>
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          collapsed={!isSidebarOpen} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[#121212] pt-10 drag-region w-full">
        {/* Mobile Header Toggle */}
        <div className="md:hidden flex items-center px-4 pb-2 no-drag border-b border-white/5">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/5 rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-drag p-4 md:p-8">
          {activeTab === 'home' && <Dashboard />}
          {activeTab === 'history' && <HistoryView />}
        </div>
      </div>
    </div>
  );
}
