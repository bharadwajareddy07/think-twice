import React, { useState } from 'react';
import { Camera, Hand, Fingerprint, Sparkles, ShieldAlert, ArrowRight, ArrowLeft, X, CheckCircle2 } from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
  onStartGame: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose, onStartGame }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '1. ALLOW CAMERA ACCESS',
      description: 'Grant webcam permission when prompted. Your camera stream is processed 100% locally in your browser memory for real-time tracking.',
      icon: <Camera className="w-12 h-12 text-cyan-400" />,
      highlight: 'HTTPS / localhost secure context supported',
    },
    {
      title: '2. HOLD HAND IN VIEW',
      description: 'Position your hand roughly 1 to 2 feet in front of your laptop or desktop webcam under reasonable lighting.',
      icon: <Hand className="w-12 h-12 text-amber-400" />,
      highlight: 'Front-facing camera auto-mirrored',
    },
    {
      title: '3. POINT YOUR INDEX FINGER',
      description: 'Extend your index finger. The computer-vision landmarker locks onto landmark 8 (index tip) as your master motion controller.',
      icon: <Fingerprint className="w-12 h-12 text-pink-400" />,
      highlight: 'Low-latency GPU accelerated tracking',
    },
    {
      title: '4. MOVE FINGER TO CONTROL ORB',
      description: 'Move your finger around. The glowing energy orb smoothly follows your fingertip across the entire screen play area.',
      icon: <Sparkles className="w-12 h-12 text-cyan-300" />,
      highlight: 'Velocity-adaptive jitter smoothing filter',
    },
    {
      title: '5. COLLECT TARGETS & AVOID HAZARDS',
      description: 'Touch glowing green, gold, speed, shield, and time targets to score points and build combos. Dodge red spiked danger mines & laser bars!',
      icon: <ShieldAlert className="w-12 h-12 text-rose-400" />,
      highlight: 'Level 1 to Level 5 escalating difficulty',
    },
  ];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0a0d14]/90 backdrop-blur-md p-4 select-none overflow-y-auto">
      <div className="w-full max-w-xl glass-panel-glow p-6 md:p-8 rounded-3xl flex flex-col items-center text-center shadow-[0_0_50px_rgba(0,240,255,0.25)] border border-cyan-500/40 my-auto">
        {/* Top Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="font-orbitron font-black text-2xl text-cyan-300">HOW TO PLAY</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Visual Card */}
        <div className="w-full my-6 p-6 rounded-2xl glass-panel border border-cyan-500/20 flex flex-col items-center min-h-[260px] justify-center">
          <div className="p-4 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 mb-4 animate-float">
            {steps[currentStep].icon}
          </div>

          <h3 className="font-orbitron font-bold text-xl text-white tracking-wide">
            {steps[currentStep].title}
          </h3>

          <p className="mt-3 text-slate-300 text-sm max-w-md leading-relaxed">
            {steps[currentStep].description}
          </p>

          <div className="mt-4 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold">
            {steps[currentStep].highlight}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center space-x-2 my-2">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                idx === currentStep
                  ? 'bg-cyan-400 w-8 shadow-[0_0_10px_rgba(0,240,255,0.8)]'
                  : 'bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="w-full mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center space-x-1 transition-all ${
              currentStep === 0
                ? 'opacity-40 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'glass-panel border-slate-700 text-slate-300 hover:text-white cursor-pointer'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>PREV</span>
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={onStartGame}
              className="cyber-button px-6 py-2.5 rounded-xl font-orbitron font-bold text-white text-sm flex items-center space-x-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-cyan-300" />
              <span>LET'S PLAY!</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className="cyber-button px-6 py-2.5 rounded-xl font-orbitron font-bold text-white text-sm flex items-center space-x-2 cursor-pointer"
            >
              <span>NEXT</span>
              <ArrowRight className="w-4 h-4 text-cyan-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
