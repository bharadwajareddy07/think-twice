import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, GameState, GameTelemetry } from './game/GameEngine';
import { StartScreen } from './components/StartScreen';
import { GameHUD } from './components/GameHUD';
import { CameraPreview } from './components/CameraPreview';
import { Countdown } from './components/Countdown';
import { PauseMenu } from './components/PauseMenu';
import { GameOver } from './components/GameOver';
import { Leaderboard } from './components/Leaderboard';
import { TutorialModal } from './components/TutorialModal';
import { DebugOverlay } from './components/DebugOverlay';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // React state synced with GameEngine at safe throttled intervals
  const [gameState, setGameState] = useState<GameState>('LOADING');
  const [telemetry, setTelemetry] = useState<GameTelemetry>({
    fps: 60,
    handDetected: false,
    confidence: 0,
    rawX: 0,
    rawY: 0,
    smoothedX: 0,
    smoothedY: 0,
    activeObjectsCount: 0,
    particleCount: 0,
  });

  // Active Modals & Overlays
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Initialize Game Engine instance
    const engine = new GameEngine();
    engineRef.current = engine;

    engine.setCallbacks(
      (newState) => {
        if (isMounted) setGameState(newState);
      },
      (telemetryData) => {
        if (isMounted) setTelemetry(telemetryData);
      }
    );

    // Canvas Resize Handler
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    if (canvasRef.current) {
      engine.setCanvas(canvasRef.current);
    }

    // Auto initialize Camera and Tracker
    engine
      .initCameraAndTracker()
      .then(() => {
        if (isMounted) {
          engine.startLoop();
        }
      })
      .catch((err: any) => {
        if (isMounted && !err.message?.includes('destroyed')) {
          console.error('Camera/Tracker init error:', err);
          setCameraError(err.message || 'Unable to access camera or load hand tracking models.');
        }
      });

    // Global Keydown Handler (ESC for pause, D for debug)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (engineRef.current) {
          engineRef.current.togglePause();
        }
      } else if (e.key === 'd' || e.key === 'D') {
        setIsDebugEnabled((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      engine.destroy();
    };
  }, []);

  const handleStartGame = () => {
    if (engineRef.current) {
      setShowTutorial(false);
      setShowLeaderboard(false);
      engineRef.current.startCountdown();
    }
  };

  const handleToggleMute = () => {
    if (engineRef.current) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      engineRef.current.audioManager.setMuted(nextMuted);
    }
  };

  const handlePause = () => {
    if (engineRef.current) {
      engineRef.current.togglePause();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0d14]">
      {/* HTML5 Gameplay Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-none" />

      {/* Camera Error Display */}
      {cameraError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/95 p-6 text-center">
          <div className="glass-panel p-8 rounded-3xl max-w-md border border-rose-500/50">
            <h2 className="font-orbitron font-black text-2xl text-rose-400">CAMERA ACCESS REQUIRED</h2>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed">{cameraError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 cyber-button px-6 py-3 rounded-xl font-orbitron font-bold text-white text-sm"
            >
              RETRY CAMERA PERMISSION
            </button>
          </div>
        </div>
      )}

      {/* Start Landing Screen */}
      {(gameState === 'READY' || gameState === 'LOADING' || gameState === 'CAMERA_PERMISSION') &&
        !showTutorial &&
        !showLeaderboard && (
          <StartScreen
            onStart={handleStartGame}
            onHowToPlay={() => setShowTutorial(true)}
            onHighScores={() => setShowLeaderboard(true)}
            isCameraReady={gameState === 'READY'}
            handDetected={telemetry.handDetected}
            onToggleDebug={() => setIsDebugEnabled(!isDebugEnabled)}
            isDebugEnabled={isDebugEnabled}
          />
        )}

      {/* Active Game HUD */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'COUNTDOWN') &&
        engineRef.current && (
          <GameHUD
            score={engineRef.current.score}
            combo={engineRef.current.combo}
            lives={engineRef.current.lives}
            survivalTimeSeconds={engineRef.current.survivalTime}
            level={engineRef.current.level}
            hasShield={engineRef.current.player?.hasShield || false}
            speedBoostTimer={engineRef.current.player?.speedBoostTimer || 0}
            isHandLostWarning={engineRef.current.isHandLostWarning}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
          />
        )}

      {/* Countdown Overlay */}
      {gameState === 'COUNTDOWN' && engineRef.current && (
        <Countdown value={engineRef.current.countdownValue} />
      )}

      {/* Pause Menu */}
      {gameState === 'PAUSED' && engineRef.current && (
        <PauseMenu
          onResume={() => engineRef.current?.setState('PLAYING')}
          onRestart={handleStartGame}
          onMainMenu={() => engineRef.current?.setState('READY')}
          isAutoPausedDueToHandLoss={engineRef.current.isHandLostWarning}
        />
      )}

      {/* Game Over Screen */}
      {gameState === 'GAME_OVER' && engineRef.current && (
        <GameOver
          score={engineRef.current.score}
          maxCombo={engineRef.current.maxCombo}
          survivalTimeSeconds={engineRef.current.survivalTime}
          level={engineRef.current.level}
          onPlayAgain={handleStartGame}
          onMainMenu={() => engineRef.current?.setState('READY')}
          onViewHighScores={() => setShowLeaderboard(true)}
        />
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}

      {/* How To Play Tutorial Modal */}
      {showTutorial && (
        <TutorialModal
          onClose={() => setShowTutorial(false)}
          onStartGame={handleStartGame}
        />
      )}

      {/* Picture-in-Picture Mirrored Camera Preview */}
      {engineRef.current && (
        <CameraPreview
          cameraManager={engineRef.current.cameraManager}
          handDetected={telemetry.handDetected}
          landmarks={engineRef.current.handTracker.detect(engineRef.current.cameraManager.getVideoElement()!, performance.now()).landmarks}
          isDebugMode={isDebugEnabled}
        />
      )}

      {/* Real-Time Telemetry Debug Overlay */}
      {isDebugEnabled && <DebugOverlay telemetry={telemetry} />}
    </div>
  );
};
