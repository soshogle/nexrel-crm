"use client";

import { useEffect, useRef } from "react";

interface GeometricShapesProps {
  audioLevel?: number;
  isAgentSpeaking?: boolean;
}

export function GeometricShapes({ audioLevel = 0, isAgentSpeaking = false }: GeometricShapesProps) {
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
          className="w-64 h-64 md:w-96 md:h-96 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl transition-opacity duration-300"
          style={{ opacity: isAgentSpeaking ? (0.5 + (audioLevel * 0.5)) : 0.5 }}
        />
      </div>
    </div>
  );
}
