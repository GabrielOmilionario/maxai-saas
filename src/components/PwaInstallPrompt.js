'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => { console.log('SW registered: ', registration.scope); },
          (err) => { console.log('SW registration failed: ', err); }
        );
      });
    }

    // Check if already installed
    const mqStandAlone = '(display-mode: standalone)';
    if (navigator.standalone || window.matchMedia(mqStandAlone).matches) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // For iOS, we can show a brief hint if they haven't dismissed it before
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        // Delay showing prompt so it's not aggressive
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
          <Download size={20} className="text-brand-purple" />
        </div>
        <div className="flex flex-col">
          <span className="text-white font-medium text-sm">Instalar MAX AI</span>
          <span className="text-zinc-400 text-xs truncate">
            {isIOS ? 'Adicione à Tela de Início para melhor experiência' : 'Acesso rápido e offline'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isIOS ? (
          <button 
            onClick={handleDismiss}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-white text-xs font-medium transition-colors"
          >
            Entendi
          </button>
        ) : (
          <button 
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-brand-purple hover:bg-brand-purple/80 rounded-lg text-white text-xs font-medium transition-colors shadow-[0_0_15px_rgba(124,58,237,0.3)]"
          >
            Instalar
          </button>
        )}
        <button 
          onClick={handleDismiss}
          className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {isIOS && (
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-full text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-black/90 rounded-lg border border-white/10 text-[11px] text-zinc-300 shadow-xl">
            Toque em <Share size={12} className="mx-0.5" /> e depois <PlusSquare size={12} className="mx-0.5" /> Adicionar à Tela de Início
          </div>
        </div>
      )}
    </div>
  );
}
