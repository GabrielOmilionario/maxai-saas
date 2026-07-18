'use client';
import { useState, useEffect } from 'react';

export default function SplashScreen({ children }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Esconde a splash screen após 2 segundos
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]">
        <div className="relative flex flex-col items-center justify-center animate-pulse duration-1000">
          {/* A imagem manterá transparência nativa */}
          <img 
            src="/logo.png" 
            alt="MAX AI Logo" 
            className="w-40 h-40 md:w-56 md:h-56 object-contain"
            style={{
              // Leve glow azul/roxo combinando com a identidade visual
              filter: 'drop-shadow(0 0 25px rgba(139, 92, 246, 0.7)) drop-shadow(0 0 45px rgba(59, 130, 246, 0.5))'
            }}
          />
        </div>
      </div>
    );
  }

  return children;
}
