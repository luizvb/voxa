import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import HistoryView from './components/HistoryView';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

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
      <div className="w-[260px] flex-shrink-0 bg-[#1e1e1e]/50 border-r border-white/10 flex flex-col pt-10 drag-region">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-[#121212] pt-10 drag-region">
        <div className="flex-1 overflow-y-auto no-drag p-8">
          {activeTab === 'home' && <Dashboard />}
          {activeTab === 'history' && <HistoryView />}
        </div>
      </div>
    </div>
  );
}
