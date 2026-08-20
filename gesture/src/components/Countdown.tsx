import React from 'react';

interface CountdownProps {
  value: number;
}

export const Countdown: React.FC<CountdownProps> = ({ value }) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none select-none">
      <div className="flex flex-col items-center">
        <span className="font-orbitron font-black text-8xl md:text-9xl text-cyan-300 drop-shadow-[0_0_50px_rgba(0,240,255,0.8)] animate-pulse">
          {value > 0 ? value : 'GO!'}
        </span>
        <p className="mt-4 text-cyan-400 font-bold tracking-widest text-sm uppercase">
          {value > 0 ? 'Point your index finger...' : 'SURVIVE & COLLECT!'}
        </p>
      </div>
    </div>
  );
};
