import React, { useEffect, useState } from 'react';

interface FloatingItem {
  id: number;
  type: 'star' | 'pill' | 'circle';
  size: number;
  color: string;
  left: string;
  top: string;
  parallaxX: number; // multiplier for mouse X influence
  parallaxY: number; // multiplier for mouse Y influence
  opacity: number;
  rotationSpeed?: number; // deg per frame/second
  driftSpeed?: number;
}

export const AntigravityObjects: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [items, setItems] = useState<FloatingItem[]>([]);

  // Initialize randomized items on component mount
  useEffect(() => {
    const brandColors = [
      '#2563EB', // Blue
      '#10B981', // Emerald
      '#1A2B5E', // Navy
      '#34D399', // Mint
      '#60A5FA', // Sky Blue
    ];

    const generatedItems: FloatingItem[] = [
      // 1. Interactive 4-pointed stars (Sparkles)
      { id: 1, type: 'star', size: 36, color: '#10B981', left: '12%', top: '15%', parallaxX: 25, parallaxY: 20, opacity: 0.18 },
      { id: 2, type: 'star', size: 50, color: '#34D399', left: '82%', top: '22%', parallaxX: -30, parallaxY: -25, opacity: 0.15 },
      { id: 3, type: 'star', size: 28, color: '#2563EB', left: '46%', top: '78%', parallaxX: 18, parallaxY: 28, opacity: 0.22 },
      { id: 4, type: 'star', size: 42, color: '#1A2B5E', left: '88%', top: '72%', parallaxX: -15, parallaxY: 35, opacity: 0.1 },

      // 2. Rounded horizontal pills (EduNova "E" Pills)
      { id: 5, type: 'pill', size: 120, color: '#2563EB', left: '5%', top: '55%', parallaxX: 40, parallaxY: 15, opacity: 0.12 },
      { id: 6, type: 'pill', size: 85, color: '#10B981', left: '74%', top: '48%', parallaxX: -25, parallaxY: -40, opacity: 0.15 },
      { id: 7, type: 'pill', size: 100, color: '#1A2B5E', left: '38%', top: '8%', parallaxX: -10, parallaxY: 20, opacity: 0.08 },
      { id: 8, type: 'pill', size: 70, color: '#38BDF8', left: '62%', top: '85%', parallaxX: 30, parallaxY: -15, opacity: 0.18 },

      // 3. Ambient blurring circles/blobs for a professional tech depth look
      { id: 9, type: 'circle', size: 420, color: 'rgba(37, 99, 235, 0.07)', left: '-10%', top: '25%', parallaxX: 15, parallaxY: 10, opacity: 0.8 },
      { id: 10, type: 'circle', size: 380, color: 'rgba(16, 185, 129, 0.06)', left: '60%', top: '45%', parallaxX: -12, parallaxY: -15, opacity: 0.8 },
      { id: 11, type: 'circle', size: 300, color: 'rgba(26, 43, 94, 0.05)', left: '30%', top: '65%', parallaxX: 8, parallaxY: -22, opacity: 0.7 },
    ];

    setItems(generatedItems);
  }, []);

  // Track cursor movement across outer window
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize values between -0.5 and 0.5 (center is 0)
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {items.map((item) => {
        // Compute offset coordinates for interactive depth / parallax feeling
        const offsetX = mousePos.x * item.parallaxX;
        const offsetY = mousePos.y * item.parallaxY;

        // Custom style injection with high-perf smooth transition
        const itemStyle: React.CSSProperties = {
          position: 'absolute',
          left: item.left,
          top: item.top,
          transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
          opacity: item.opacity,
          zIndex: 1,
        };

        if (item.type === 'circle') {
          return (
            <div
              key={item.id}
              style={{
                ...itemStyle,
                width: item.size,
                height: item.size,
                backgroundColor: item.color,
                borderRadius: '50%',
                filter: 'blur(80px)',
              }}
              className="animate-pulse"
            />
          );
        }

        if (item.type === 'pill') {
          return (
            <div
              key={item.id}
              style={{
                ...itemStyle,
                width: item.size,
                height: item.size * 0.22,
                borderRadius: '100px',
                background: `linear-gradient(135deg, ${item.color}, ${item.color}bb)`,
              }}
              className="hidden md:block shadow-inner shadow-white/5 opacity-30 animate-bounce mt-2"
            >
              <div 
                className="w-full h-full rounded-full opacity-40 blur-[2px]" 
                style={{ backgroundColor: item.color }}
              />
            </div>
          );
        }

        if (item.type === 'star') {
          return (
            <div
              key={item.id}
              style={itemStyle}
              className="flex items-center justify-center"
            >
              <svg
                width={item.size}
                height={item.size}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="animate-spin-slow"
                style={{ 
                  animationDuration: `${30 + item.id * 10}s`,
                  filter: `drop-shadow(0 0 8px ${item.color}44)` 
                }}
              >
                <path
                  d="M 50 10 C 50 30, 70 50, 90 50 C 70 50, 50 70, 50 90 C 50 70, 30 50, 10 50 C 30 50, 50 30, 50 10 Z"
                  fill={item.color}
                />
              </svg>
            </div>
          );
        }

        return null;
      })}

      {/* Embedded slower rotating animation details inside CSS inject */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow linear infinite;
        }
      `}</style>
    </div>
  );
};
