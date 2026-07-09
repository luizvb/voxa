import { Mic, ArrowRight } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="w-full max-w-md p-8 bg-card rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center">
      <div className="w-16 h-16 bg-gradient-to-br from-[#00F2FE] to-[#4FACFE] rounded-2xl flex items-center justify-center mb-6 shadow-[0_4px_16px_rgba(79,172,254,0.3)]">
        <Mic className="w-8 h-8 text-black" />
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Welcome to VoiceDesk</h1>
      <p className="text-muted-foreground text-center mb-8">
        Your bidirectional voice recorder for macOS. Sign in to sync your sessions.
      </p>

      <div className="w-full space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input 
            type="email" 
            placeholder="name@example.com"
            className="w-full h-10 px-3 bg-[#1e1e1e] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            defaultValue="mock@user.com"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <input 
            type="password" 
            placeholder="••••••••"
            className="w-full h-10 px-3 bg-[#1e1e1e] border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            defaultValue="password"
          />
        </div>

        <button 
          onClick={onLogin}
          className="w-full h-10 mt-4 bg-foreground text-background font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
        >
          Sign In
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
