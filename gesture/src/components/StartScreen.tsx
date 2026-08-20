import React from 'react';
import { Play, HelpCircle, Trophy, ShieldCheck, Camera, Sparkles, Bug } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
  onHowToPlay: () => void;
  onHighScores: () => void;
  isCameraReady: boolean;
  handDetected: boolean;
  onToggleDebug: () => void;
  isDebugEnabled: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  onHowToPlay,
  onHighScores,
  isCameraReady,
  handDetected,
  onToggleDebug,
  isDebugEnabled,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 bg-[#0a0d14]/90 backdrop-blur-md select-none overflow-y-auto">
      {/* Top Header & Debug Toggle */}
      <div className="w-full max-w-5xl flex justify-between items-center pt-2">
        <div className="flex items-center space-x-2 text-cyan-400 font-orbitron font-bold text-sm tracking-wider">
          <Sparkles className="w-5 h-5 animate-pulse text-cyan-400" />
          <span>FINGER RUSH // NEXT-GEN CV GAME</span>
        </div>

        <button
          onClick={onToggleDebug}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
            isDebugEnabled
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
              : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bug className="w-3.5 h-3.5" />
          <span>DEBUG {isDebugEnabled ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Hero Title & Subtitle */}
      <div className="flex flex-col items-center text-center my-auto max-w-3xl">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          <span>Webcam Computer-Vision Powered</span>
        </div>

        <h1 className="font-orbitron font-black text-6xl md:text-8xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-pink-500 drop-shadow-[0_0_35px_rgba(0,240,255,0.4)]">
          FINGER RUSH
        </h1>

        <p className="mt-3 text-lg md:text-xl text-slate-300 max-w-xl font-medium">
          Control the glowing energy orb with your <span className="text-cyan-400 font-bold">index finger</span> in real time using your webcam.
        </p>

        {/* Live Camera Readiness Badge */}
        <div className="mt-6 flex items-center space-x-3 px-5 py-2.5 rounded-2xl glass-panel border border-cyan-500/30">
          <Camera className="w-5 h-5 text-cyan-400" />
          <div className="text-left text-sm">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isCameraReady ? (handDetected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400') : 'bg-rose-500'}`} />
              <span className="font-bold text-white">
                {!isCameraReady
                  ? 'Initializing Camera & Model...'
                  : handDetected
                  ? '✋ Hand Detected! Ready to Play!'
                  : 'Move hand into camera view'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Point your index finger in front of the lens to take control.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button
            onClick={onStart}
            className="cyber-button w-full sm:w-auto flex-1 flex items-center justify-center space-x-3 px-8 py-4 rounded-xl font-orbitron font-bold text-lg text-white shadow-lg cursor-pointer"
          >
            <Play className="w-6 h-6 text-cyan-400 fill-cyan-400" />
            <span>START GAME</span>
          </button>

          <button
            onClick={onHowToPlay}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-4 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400/50 text-slate-200 hover:text-white font-semibold transition-all cursor-pointer"
          >
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span>HOW TO PLAY</span>
          </button>

          <button
            onClick={onHighScores}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-4 rounded-xl glass-panel border border-slate-700 hover:border-amber-400/50 text-slate-200 hover:text-amber-300 font-semibold transition-all cursor-pointer"
          >
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>SCORES</span>
          </button>
        </div>
      </div>

      {/* Footer Privacy Banner */}
      <div className="w-full max-w-md flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span>Your webcam feed is processed 100% locally in browser memory. Video is never stored or uploaded.</span>
      </div>
    </div>
  );
};
