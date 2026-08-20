import React from 'react';
import { Heart, Volume2, VolumeX, Pause, Shield, Zap, AlertTriangle } from 'lucide-react';

interface GameHUDProps {
  score: number;
  combo: number;
  lives: number;
  survivalTimeSeconds: number;
  level: number;
  hasShield: boolean;
  speedBoostTimer: number;
  isHandLostWarning: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  combo,
  lives,
  survivalTimeSeconds,
  level,
  hasShield,
  speedBoostTimer,
  isHandLostWarning,
  isMuted,
  onToggleMute,
  onPause,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const comboMultiplier = Math.min(5, 1 + Math.floor(combo / 4));

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Top HUD Bar */}
      <div className="flex items-start justify-between w-full">
        {/* Score & Combo */}
        <div className="flex flex-col space-y-1">
          <div className="glass-panel-glow px-4 py-2 rounded-2xl flex items-baseline space-x-3 pointer-events-auto">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">SCORE</span>
            <span className="font-orbitron font-black text-3xl md:text-4xl text-cyan-300 drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div
              className={`px-3 py-1 rounded-xl text-xs font-orbitron font-bold border transition-all ${
                comboMultiplier > 1
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(255,215,0,0.4)] animate-bounce'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              COMBO x{comboMultiplier} ({combo})
            </div>

            {hasShield && (
              <div className="px-2.5 py-1 rounded-xl bg-purple-900/60 border border-purple-400 text-purple-300 text-xs font-bold flex items-center space-x-1 shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                <Shield className="w-3.5 h-3.5 text-purple-300" />
                <span>SHIELD ACTIVE</span>
              </div>
            )}

            {speedBoostTimer > 0 && (
              <div className="px-2.5 py-1 rounded-xl bg-blue-900/60 border border-blue-400 text-blue-300 text-xs font-bold flex items-center space-x-1 shadow-[0_0_12px_rgba(59,130,246,0.4)]">
                <Zap className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
                <span>SPEED {Math.ceil(speedBoostTimer)}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Center Level Badge */}
        <div className="hidden sm:flex flex-col items-center">
          <div className="glass-panel px-4 py-1.5 rounded-full border border-cyan-500/40 text-cyan-400 font-orbitron font-extrabold text-sm tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            LEVEL {level}
          </div>
          <span className="text-[10px] text-slate-400 font-semibold mt-1">TIME {formatTime(survivalTimeSeconds)}</span>
        </div>

        {/* Lives & Controls */}
        <div className="flex items-center space-x-3 pointer-events-auto">
          {/* Hearts */}
          <div className="glass-panel px-3 py-2 rounded-2xl flex items-center space-x-1 border border-rose-500/30">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-6 h-6 transition-all duration-300 ${
                  i < lives
                    ? 'text-rose-500 fill-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)] scale-100'
                    : 'text-slate-700 fill-slate-800 scale-90'
                }`}
              />
            ))}
          </div>

          {/* Sound Mute */}
          <button
            onClick={onToggleMute}
            className="glass-panel p-2.5 rounded-xl border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            className="glass-panel p-2.5 rounded-xl border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Pause Game (ESC)"
          >
            <Pause className="w-5 h-5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Hand Lost Warning Bar */}
      {isHandLostWarning && (
        <div className="self-center mb-12 flex items-center space-x-3 px-6 py-3 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-200 font-semibold shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-pulse pointer-events-auto">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span>✋ Hand temporary lost! Move your index finger back into camera view</span>
        </div>
      )}
    </div>
  );
};
