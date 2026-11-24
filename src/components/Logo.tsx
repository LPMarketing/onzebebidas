import React from 'react';
import logoBadgeImg from '../assets/images/regenerated_image_1787856359177.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showSubtitle = true, className = '' }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const badgeSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-13 h-13',
    xl: 'w-16 h-16',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div
        className={`${badgeSizes[size]} rounded-full overflow-hidden bg-[#0A0B0E] p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(197,138,58,0.3)] border border-[#C58A3A]/50 shrink-0 transition-transform hover:scale-105`}
      >
        <img
          src={logoBadgeImg}
          alt="Onze Lounge"
          className="w-full h-full object-cover rounded-full"
        />
      </div>
      <div>
        <div className={`font-serif tracking-[0.2em] uppercase font-bold text-white leading-none ${sizeClasses[size]}`}>
          ONZE <span className="text-[#C58A3A]">LOUNGE</span>
        </div>
        {showSubtitle && (
          <div className="text-[10px] tracking-[0.35em] text-neutral-400 uppercase mt-1 font-medium">
            Exclusive Experience
          </div>
        )}
      </div>
    </div>
  );
};
