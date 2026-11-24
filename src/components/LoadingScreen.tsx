import React from 'react';
import { Logo } from './Logo';

export const LoadingScreen: React.FC = () => {
  return (
    <div
      id="loading-screen"
      className="min-h-screen w-full bg-[#08090A] text-white flex flex-col items-center justify-center p-6"
    >
      <div className="flex flex-col items-center gap-6">
        <Logo size="lg" />
        <div className="flex items-center gap-2 mt-4">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C58A3A] animate-pulse" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#C58A3A] animate-pulse delay-150" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#C58A3A] animate-pulse delay-300" />
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-medium">
          Carregando sistema...
        </p>
      </div>
    </div>
  );
};
