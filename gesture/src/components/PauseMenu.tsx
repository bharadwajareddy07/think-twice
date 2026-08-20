import React from 'react';
import { Play, RotateCcw, Home, AlertCircle } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  isAutoPausedDueToHandLoss: boolean;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onMainMenu,
  isAutoPausedDueToHandLoss,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0a0d14]/85 backdrop-blur-md p-6 select-none">
      <div className="w-full max-w-md glass-panel-glow p-8 rounded-3xl flex flex-col items-center text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-cyan-500/40">
        {isAutoPausedDueToHandLoss ? (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center mb-4 text-amber-400 animate-bounce">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="font-orbitron font-black text-3xl text-amber-300">HAND LOST</h2>
            <p className="mt-2 text-slate-300 text-sm">
              Show your hand in front of the webcam to resume control of the energy orb.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-orbitron font-black text-4xl text-cyan-300 tracking-wider">GAME PAUSED</h2>
            <p className="mt-2 text-slate-400 text-sm">Take a breather or change your position.</p>
          </>
        )}

        <div className="mt-8 flex flex-col space-y-3 w-full">
          <button
            onClick={onResume}
            className="cyber-button w-full py-3.5 rounded-xl font-orbitron font-bold text-white flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Play className="w-5 h-5 text-cyan-300 fill-cyan-300" />
            <span>RESUME GAME</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3.5 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5 text-cyan-400" />
            <span>RESTART</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-3.5 rounded-xl glass-panel border border-slate-700 hover:border-rose-400/50 text-slate-300 hover:text-rose-300 font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Home className="w-5 h-5 text-rose-400" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
