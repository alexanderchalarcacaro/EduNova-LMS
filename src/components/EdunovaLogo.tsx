import React from 'react';

interface EdunovaLogoProps {
  className?: string;
  size?: number; // width and height in px
  showText?: boolean;
  textColorClass?: string;
}

export const EdunovaLogo: React.FC<EdunovaLogoProps> = ({ 
  className = '', 
  size = 40, 
  showText = false,
  textColorClass = 'text-slate-900 font-bold'
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        width={size} 
        height={(size * 0.9).toFixed(0)} 
        viewBox="0 0 100 90" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="logo_blue_gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E40AF" /> {/* Deep blue */}
            <stop offset="100%" stopColor="#3B82F6" /> {/* Electric blue */}
          </linearGradient>
          <linearGradient id="logo_teal_green_gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="60%" stopColor="#10B981" /> {/* Emerald */}
            <stop offset="100%" stopColor="#34D399" /> {/* Mint */}
          </linearGradient>
        </defs>

        {/* Top Horizontal rounded pill */}
        <rect 
          x="10" 
          y="20" 
          width="36" 
          height="8" 
          rx="4" 
          fill="url(#logo_blue_gradient)" 
        />

        {/* Middle Horizontal rounded pill (slightly shorter) */}
        <rect 
          x="10" 
          y="42" 
          width="26" 
          height="8" 
          rx="4" 
          fill="url(#logo_blue_gradient)" 
        />

        {/* Bottom Horizontal rounded pill, which flows diagonally up-right and straight down */}
        {/* We use stroke with round join and caps to match the gorgeous smooth continuous look */}
        <path 
          d="M 14 68 L 34 68 C 39 68 42 66 45 62 L 72 32 C 74 29 76 29 76 33 L 76 68" 
          stroke="url(#logo_teal_green_gradient)" 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Emerald Sparkle (Four-pointed Star) */}
        <path 
          d="M 85 8 C 85 12 87 14 91 14 C 87 14 85 16 85 20 C 85 16 83 14 79 14 C 83 14 85 12 85 8 Z" 
          fill="#34D399" 
        />
      </svg>
      {showText && (
        <span className={`text-xl font-display font-bold tracking-tight ${textColorClass}`}>
          Edunova
        </span>
      )}
    </div>
  );
};
