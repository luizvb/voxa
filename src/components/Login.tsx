import { ArrowRight } from 'lucide-react';
import { Logo } from './Logo';

export default function Login({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="w-full max-w-md p-8 glass rounded-2xl shadow-2xl flex flex-col items-center">
      <div className="mb-6 shadow-[0_4px_32px_rgba(0,229,255,0.2)] rounded-full p-2 bg-black/50 border border-white/5">
        <Logo className="w-12 h-12" />
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Welcome to Voxa</h1>
      <p className="text-muted-foreground text-center mb-8">
        The intelligence behind every conversation. Sign in to sync your sessions.
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
          className="w-full h-10 mt-4 bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(180,0,255,0.3)]"
        >
          Sign In
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
