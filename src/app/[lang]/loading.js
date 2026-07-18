import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/50 backdrop-blur-sm">
      <div className="relative flex flex-col items-center justify-center">
        <img 
          src="/logo.png" 
          alt="Carregando..." 
          className="w-16 h-16 animate-spin duration-1000 object-contain"
          style={{
            filter: 'drop-shadow(0 0 15px rgba(139, 92, 246, 0.7))'
          }}
        />
      </div>
    </div>
  );
}
