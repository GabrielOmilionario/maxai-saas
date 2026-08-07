'use client';
import { useState, useEffect } from 'react';

export default function SplashScreen({ children }) {
  const [showSplash, setShowSplash] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Começa a transição de saída um pouco antes de remover o componente
    const leaveTimer = setTimeout(() => {
      setIsLeaving(true);
    }, 1800);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2400);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!showSplash) {
    return children;
  }

  return (
    <>
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center bg-[#000000] transition-opacity duration-700 ease-in-out ${
          isLeaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes logoReveal {
            0% { transform: scale(0.7) translateY(10px); opacity: 0; filter: blur(10px); }
            60% { transform: scale(1.05) translateY(-2px); filter: blur(0px); opacity: 1; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          @keyframes logoFloat {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
          .animate-logo-reveal {
            animation: logoReveal 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
          .animate-logo-float {
            animation: logoFloat 4s ease-in-out infinite;
            animation-delay: 1.2s; /* Start after reveal */
          }
        `}} />
        <div className="relative flex flex-col items-center justify-center">
          <div className="animate-logo-reveal">
            <div className="animate-logo-float">
              <img 
                src="/logo.png" 
                alt="MAX AI Logo" 
                className="w-40 h-40 md:w-56 md:h-56 object-contain"
                style={{
                  filter: 'drop-shadow(0 10px 25px rgba(255, 255, 255, 0.15))'
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Mostra o conteúdo por trás enquanto a splash screen faz fade out */}
      <div className={isLeaving ? '' : 'hidden'}>
        {children}
      </div>
    </>
  );
}
