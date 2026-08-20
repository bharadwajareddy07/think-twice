import React, { useState, useEffect } from 'react';
import { Trophy, Award, Crown, X, ArrowLeft } from 'lucide-react';
import { getHighScores, HighScoreRecord } from '../utils/storage';

interface LeaderboardProps {
  onClose: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
  const [scores, setScores] = useState<HighScoreRecord[]>([]);

  useEffect(() => {
    setScores(getHighScores());
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />;
    if (index === 1) return <Award className="w-5 h-5 text-slate-300 fill-slate-300" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-700 fill-amber-700" />;
    return <span className="font-orbitron font-bold text-slate-400 text-sm">#{index + 1}</span>;
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0a0d14]/90 backdrop-blur-md p-4 select-none overflow-y-auto">
      <div className="w-full max-w-2xl glass-panel-glow p-6 md:p-8 rounded-3xl flex flex-col items-center shadow-[0_0_50px_rgba(0,240,255,0.2)] border border-cyan-500/40 my-auto max-h-[90vh]">
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400 text-amber-300">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-orbitron font-black text-2xl md:text-3xl text-cyan-300">HIGH SCORES</h2>
              <p className="text-xs text-slate-400">LOCAL COMPETITION LEADERBOARD</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Table */}
        <div className="w-full mt-6 overflow-y-auto pr-1 flex-1 space-y-2">
          {scores.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No high scores recorded yet. Be the first!</div>
          ) : (
            scores.map((rec, idx) => (
              <div
                key={rec.id || idx}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  idx === 0
                    ? 'bg-amber-950/40 border-amber-400/50 shadow-[0_0_15px_rgba(255,215,0,0.15)]'
                    : idx === 1
                    ? 'bg-slate-900/80 border-slate-600'
                    : idx === 2
                    ? 'bg-slate-900/60 border-amber-800/40'
                    : 'bg-slate-900/40 border-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 flex justify-center">{getRankBadge(idx)}</div>
                  <div>
                    <div className="font-orbitron font-bold text-white text-sm md:text-base">{rec.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-3 mt-0.5">
                      <span>COMBO x{rec.maxCombo}</span>
                      <span>•</span>
                      <span>{formatTime(rec.survivalTimeSeconds)}</span>
                      <span>•</span>
                      <span>LVL {rec.level}</span>
                    </div>
                  </div>
                </div>

                <div className="font-orbitron font-black text-xl text-cyan-300">{rec.score.toLocaleString()}</div>
              </div>
            ))
          )}
        </div>

        {/* Back Button */}
        <div className="w-full mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white font-semibold flex items-center space-x-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>BACK</span>
          </button>
        </div>
      </div>
    </div>
  );
};
