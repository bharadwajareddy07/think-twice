import React, { useState, useEffect } from 'react';
import { Play, Home, Trophy, Award, Sparkles, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveHighScore, getHighScores } from '../utils/storage';

interface GameOverProps {
  score: number;
  maxCombo: number;
  survivalTimeSeconds: number;
  level: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onViewHighScores: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
  score,
  maxCombo,
  survivalTimeSeconds,
  level,
  onPlayAgain,
  onMainMenu,
  onViewHighScores,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  useEffect(() => {
    // Check if score ranks in top 10
    const topScores = getHighScores();
    if (topScores.length < 10 || score > (topScores[topScores.length - 1]?.score || 0)) {
      setIsNewHighScore(true);
      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#ffd700', '#ff007f'],
        });
      } catch (e) {
        // canvas-confetti fallback
      }
    }
  }, [score]);

  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted || !playerName.trim()) return;
    saveHighScore(playerName, score, maxCombo, survivalTimeSeconds, level);
    setIsSubmitted(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0a0d14]/90 backdrop-blur-md p-6 select-none overflow-y-auto">
      <div className="w-full max-w-xl glass-panel-glow p-8 rounded-3xl flex flex-col items-center text-center shadow-[0_0_60px_rgba(255,42,95,0.25)] border border-rose-500/40 my-auto">
        {/* Header */}
        <h2 className="font-orbitron font-black text-5xl md:text-6xl text-rose-500 tracking-wider drop-shadow-[0_0_25px_rgba(255,42,95,0.6)]">
          GAME OVER
        </h2>

        {isNewHighScore && (
          <div className="mt-2 flex items-center space-x-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-orbitron font-bold text-xs shadow-[0_0_15px_rgba(255,215,0,0.5)] animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>NEW HIGH SCORE RECORD!</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 w-full mt-6">
          <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">FINAL SCORE</span>
            <span className="font-orbitron font-black text-3xl md:text-4xl text-cyan-300 mt-1">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">MAX COMBO</span>
            <span className="font-orbitron font-black text-3xl md:text-4xl text-amber-400 mt-1">
              x{maxCombo}
            </span>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">SURVIVAL TIME</span>
            <span className="font-orbitron font-black text-2xl md:text-3xl text-emerald-400 mt-1">
              {formatTime(survivalTimeSeconds)}
            </span>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-purple-500/30 flex flex-col items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">LEVEL REACHED</span>
            <span className="font-orbitron font-black text-2xl md:text-3xl text-purple-400 mt-1">
              LEVEL {level}
            </span>
          </div>
        </div>

        {/* High Score Name Input Form */}
        {!isSubmitted ? (
          <form onSubmit={handleSubmitScore} className="w-full mt-6 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              maxLength={15}
              placeholder="ENTER YOUR PLAYER NAME"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="flex-1 bg-slate-900/80 border border-cyan-500/50 rounded-xl px-4 py-3 text-cyan-200 placeholder-slate-500 font-orbitron text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 uppercase"
              required
            />
            <button
              type="submit"
              className="cyber-button px-6 py-3 rounded-xl font-orbitron font-bold text-white flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Send className="w-4 h-4 text-cyan-300" />
              <span>SAVE</span>
            </button>
          </form>
        ) : (
          <div className="w-full mt-6 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-sm">
            ✓ SCORE RECORDED IN LEADERBOARD!
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            onClick={onPlayAgain}
            className="cyber-button w-full sm:w-auto flex-1 py-3.5 px-6 rounded-xl font-orbitron font-bold text-white flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Play className="w-5 h-5 text-cyan-300 fill-cyan-300" />
            <span>PLAY AGAIN</span>
          </button>

          <button
            onClick={onViewHighScores}
            className="w-full sm:w-auto py-3.5 px-5 rounded-xl glass-panel border border-slate-700 hover:border-amber-400 text-slate-200 hover:text-amber-300 font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>LEADERBOARD</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full sm:w-auto py-3.5 px-5 rounded-xl glass-panel border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Home className="w-5 h-5 text-slate-400" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
