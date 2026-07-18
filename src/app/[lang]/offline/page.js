'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4" style={{ backgroundColor: '#000000', color: '#FFFFFF' }}>
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-brand-purple/20 blur-[50px] rounded-full" />
        <WifiOff size={80} className="text-brand-purple relative z-10" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
        Sem conexão com a internet
      </h1>
      
      <p className="text-zinc-400 text-lg md:text-xl max-w-md mb-10">
        Conecte-se para continuar usando o MAX AI
      </p>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-all hover:scale-105"
      >
        <RefreshCw size={20} />
        Tentar novamente
      </button>
    </div>
  );
}
