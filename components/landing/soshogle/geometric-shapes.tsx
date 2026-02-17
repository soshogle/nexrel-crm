"use client";

import { useEffect, useRef } from "react";

interface GeometricShapesProps {
  audioLevel?: number;
  isAgentSpeaking?: boolean;
  /** When true, waves only — no center mic (for frameless overlay with tap-to-start) */
  bare?: boolean;
}

export function GeometricShapes({ audioLevel = 0, isAgentSpeaking = false, bare = false }: GeometricShapesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    let animationFrame: number;
    let rotation = 0;
    let pulsePhase = 0;

    const draw = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = Math.min(canvas.width, canvas.height) * 0.35;

      const basePulse = 1 + Math.sin(pulsePhase) * 0.08;
      const agentAudioPulse = isAgentSpeaking ? (1 + (audioLevel * 0.5)) : 1;
      const pulse = basePulse * agentAudioPulse;
      const radius = baseRadius * pulse;

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.3,
        centerX,
        centerY,
        radius
      );

      const intensity = isAgentSpeaking ? (0.4 + (audioLevel * 0.4)) : 0.4;
      gradient.addColorStop(0, `rgba(34, 211, 238, ${intensity})`);
      gradient.addColorStop(0.4, `rgba(139, 92, 246, ${intensity + 0.1})`);
      gradient.addColorStop(0.7, `rgba(34, 211, 238, ${intensity * 0.7})`);
      gradient.addColorStop(1, `rgba(139, 92, 246, ${intensity * 0.3})`);

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);
      ctx.translate(-centerX, -centerY);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      const segments = 8;
      const audioBoost = isAgentSpeaking ? (audioLevel * 3) : 0;

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + rotation;
        const waveIntensity = Math.sin(angle * 3 + pulsePhase * 2) * 0.5 + 0.5;
        const audioWave = waveIntensity + audioBoost;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(
          centerX,
          centerY,
          radius * (0.7 + audioWave * 0.3),
          angle,
          angle + (Math.PI * 2) / segments
        );
        ctx.closePath();

        const segmentGradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          radius
        );

        const segmentIntensity = isAgentSpeaking ? (0.3 + (audioLevel * 0.5)) : 0.3;

        if (i % 2 === 0) {
          segmentGradient.addColorStop(0, `rgba(139, 92, 246, ${segmentIntensity})`);
          segmentGradient.addColorStop(1, "rgba(139, 92, 246, 0)");
        } else {
          segmentGradient.addColorStop(0, `rgba(34, 211, 238, ${segmentIntensity})`);
          segmentGradient.addColorStop(1, "rgba(34, 211, 238, 0)");
        }

        ctx.fillStyle = segmentGradient;
        ctx.fill();
      }

      ctx.restore();

      const glowIntensity = isAgentSpeaking ? (0.2 + (pulse * 0.1) + (audioLevel * 0.5)) : (0.2 + (pulse * 0.1));
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(139, 92, 246, ${glowIntensity})`;
      ctx.lineWidth = isAgentSpeaking ? (2 + (audioLevel * 5)) : 2;
      ctx.stroke();

      const innerGlow = isAgentSpeaking ? (0.3 + (pulse * 0.15) + (audioLevel * 0.6)) : (0.3 + (pulse * 0.15));
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(34, 211, 238, ${innerGlow})`;
      ctx.lineWidth = isAgentSpeaking ? (3 + (audioLevel * 6)) : 3;
      ctx.stroke();

      const rotationSpeed = isAgentSpeaking ? (0.005 + (audioLevel * 0.02)) : 0.005;
      rotation += rotationSpeed;

      const pulseSpeed = isAgentSpeaking ? (0.03 + (audioLevel * 0.08)) : 0.03;
      pulsePhase += pulseSpeed;

      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", updateSize);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [audioLevel, isAgentSpeaking]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ filter: "blur(0.5px)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`rounded-full blur-3xl transition-opacity duration-300 ${bare ? 'w-48 h-48' : 'w-64 h-64 md:w-96 md:h-96'} ${!bare ? 'bg-gradient-to-br from-primary/20 to-secondary/20' : ''}`}
          style={{
            ...(bare && { background: 'linear-gradient(to bottom right, rgba(34, 211, 238, 0.2), rgba(139, 92, 246, 0.2))' }),
            opacity: isAgentSpeaking ? (0.5 + (audioLevel * 0.5)) : 0.5,
          }}
        />
      </div>
      {!bare && (
      /* Centered Microphone Icon - Matches landing page design */
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="relative">
          {/* Blue circle outline around mic */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 transition-all duration-300"
              style={{
                borderColor: isAgentSpeaking 
                  ? `rgba(34, 211, 238, ${0.8 + (audioLevel * 0.2)})` 
                  : 'rgba(34, 211, 238, 0.6)',
                boxShadow: isAgentSpeaking
                  ? `0 0 20px rgba(34, 211, 238, ${0.5 + (audioLevel * 0.3)})`
                  : '0 0 10px rgba(34, 211, 238, 0.3)',
              }}
            />
          </div>
          {/* Microphone Icon */}
          <svg 
            className="w-12 h-12 md:w-16 md:h-16 transition-all duration-300"
            style={{
              color: isAgentSpeaking 
                ? `rgba(139, 92, 246, ${1})` 
                : 'rgba(139, 92, 246, 0.9)',
              filter: isAgentSpeaking
                ? `drop-shadow(0 0 8px rgba(139, 92, 246, ${0.8 + (audioLevel * 0.2)}))`
                : 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.5))',
              transform: isAgentSpeaking ? `scale(${1 + (audioLevel * 0.1)})` : 'scale(1)',
            }}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
            />
          </svg>
        </div>
      </div>
      )}
    </div>
  );
}
