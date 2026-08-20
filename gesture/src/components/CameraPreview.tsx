import React, { useEffect, useRef } from 'react';
import { CameraManager } from '../tracking/CameraManager';
import { Camera, Eye, EyeOff } from 'lucide-react';

interface CameraPreviewProps {
  cameraManager: CameraManager;
  handDetected: boolean;
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  isDebugMode: boolean;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  cameraManager,
  handDetected,
  landmarks,
  isDebugMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const videoEl = cameraManager.getVideoElement();
    if (videoEl && containerRef.current) {
      // Append video stream element if not already present
      if (!containerRef.current.contains(videoEl)) {
        videoEl.style.display = 'block';
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        videoEl.style.transform = 'scaleX(-1)'; // Mirrored view
        containerRef.current.appendChild(videoEl);
      }
    }
  }, [cameraManager]);

  // Draw hand skeleton overlay on canvas if debug mode is active
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isDebugMode && landmarks && landmarks.length > 0) {
      ctx.save();
      // Mirror skeleton canvas x to match video scaleX(-1)
      ctx.fillStyle = '#00f0ff';
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;

      // Connections between hand landmarks
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17] // Palm
      ];

      for (const [i, j] of connections) {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        ctx.beginPath();
        ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
        ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
        ctx.stroke();
      }

      // Render joint dots
      landmarks.forEach((lm, idx) => {
        const x = (1 - lm.x) * canvas.width;
        const y = lm.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, idx === 8 ? 6 : 3, 0, Math.PI * 2);
        ctx.fillStyle = idx === 8 ? '#ff007f' : '#00f0ff';
        ctx.fill();
      });

      ctx.restore();
    }
  }, [landmarks, isDebugMode]);

  return (
    <div className="absolute bottom-4 right-4 z-20 pointer-events-auto flex flex-col items-end">
      <div className="relative w-44 h-32 md:w-52 md:h-36 rounded-2xl overflow-hidden glass-panel border border-cyan-500/30 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        {/* Video feed container */}
        <div ref={containerRef} className="absolute inset-0 bg-slate-900" />

        {/* Skeleton Canvas Overlay */}
        <canvas
          ref={canvasRef}
          width={208}
          height={144}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Status Indicator Badge */}
        <div className="absolute top-2 left-2 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-[10px] font-bold">
          <span className={`w-2 h-2 rounded-full ${handDetected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
          <span className={handDetected ? 'text-emerald-300' : 'text-slate-400'}>
            {handDetected ? 'TRACKING' : 'NO HAND'}
          </span>
        </div>
      </div>
    </div>
  );
};
