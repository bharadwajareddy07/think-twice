import React from 'react';
import { GameTelemetry } from '../game/GameEngine';
import { Activity, Cpu, Layers, Sparkles } from 'lucide-react';

interface DebugOverlayProps {
  telemetry: GameTelemetry;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ telemetry }) => {
  return (
    <div className="absolute top-4 left-4 z-20 pointer-events-none select-none font-mono text-[11px]">
      <div className="glass-panel p-3 rounded-2xl border border-cyan-500/40 text-cyan-300 space-y-1.5 shadow-[0_0_20px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="flex items-center space-x-1.5 border-b border-cyan-500/30 pb-1 font-bold text-xs text-white">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>REAL-TIME TELEMETRY</span>
        </div>

        <div className="flex justify-between items-center space-x-4">
          <span className="text-slate-400">FPS:</span>
          <span className={`font-bold ${telemetry.fps >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {telemetry.fps} FPS
          </span>
        </div>

        <div className="flex justify-between items-center space-x-4">
          <span className="text-slate-400">HAND:</span>
          <span className={`font-bold ${telemetry.handDetected ? 'text-emerald-400' : 'text-rose-400'}`}>
            {telemetry.handDetected ? 'DETECTED' : 'NO HAND'}
          </span>
        </div>

        <div className="flex justify-between items-center space-x-4">
          <span className="text-slate-400">CONFIDENCE:</span>
          <span className="font-bold text-cyan-300">{(telemetry.confidence * 100).toFixed(0)}%</span>
        </div>

        <div className="flex justify-between items-center space-x-4">
          <span className="text-slate-400">INDEX RAW:</span>
          <span className="text-slate-300">
            X:{telemetry.rawX.toFixed(2)} Y:{telemetry.rawY.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center space-x-4">
          <span className="text-slate-400">INDEX SMOOTH:</span>
          <span className="text-slate-200 font-bold">
            X:{telemetry.smoothedX.toFixed(2)} Y:{telemetry.smoothedY.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center space-x-4 border-t border-slate-800 pt-1">
          <span className="text-slate-400">OBJECTS:</span>
          <span className="text-amber-300 font-bold">{telemetry.activeObjectsCount}</span>
        </div>

        <div className="flex justify-between items-center space-x-4">
          <span className="text-slate-400">PARTICLES:</span>
          <span className="text-pink-300 font-bold">{telemetry.particleCount}</span>
        </div>
      </div>
    </div>
  );
};
