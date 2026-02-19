/**
 * MotionImage — Ken Burns / AgentPulse-style effect for product photos.
 * Applies subtle zoom + pan to create a cinematic, video-like feel.
 * Pauses on hover so users can inspect the image.
 */
import { useMemo, useState } from "react";

type PanDirection = "up" | "down" | "left" | "right" | "up-left" | "up-right" | "down-left" | "down-right";

const DIRECTIONS: PanDirection[] = ["up", "up-right", "right", "down-right", "down", "down-left", "left", "up-left"];

function getKeyframes(direction: PanDirection) {
  const move = 10;
  const scaleEnd = 1.25;
  switch (direction) {
    case "up":
      return { from: "0 0 1", to: `0 ${move}% ${scaleEnd}` };
    case "down":
      return { from: `0 ${move}% ${scaleEnd}`, to: "0 0 1" };
    case "left":
      return { from: `${move}% 0 ${scaleEnd}`, to: "0 0 1" };
    case "right":
      return { from: "0 0 1", to: `${-move}% 0 ${scaleEnd}` };
    case "up-left":
      return { from: `${move}% ${move}% ${scaleEnd}`, to: "0 0 1" };
    case "up-right":
      return { from: `${-move}% ${move}% ${scaleEnd}`, to: "0 0 1" };
    case "down-left":
      return { from: `${move}% ${-move}% ${scaleEnd}`, to: "0 0 1" };
    case "down-right":
      return { from: `${-move}% ${-move}% ${scaleEnd}`, to: "0 0 1" };
    default:
      return { from: "0 0 1", to: `0 ${move}% ${scaleEnd}` };
  }
}

export interface MotionImageProps {
  src: string;
  alt: string;
  index?: number;
  duration?: number;
  className?: string;
  disabled?: boolean;
  fallback?: React.ReactNode;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export default function MotionImage({
  src,
  alt,
  index = 0,
  duration = 10,
  className = "",
  disabled = false,
  fallback,
  onError,
}: MotionImageProps) {
  const [errored, setErrored] = useState(false);
  const direction = useMemo(() => DIRECTIONS[index % DIRECTIONS.length], [index]);
  const { from, to } = useMemo(() => getKeyframes(direction), [direction]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setErrored(true);
    onError?.(e);
  };

  if (errored && fallback) {
    return (
      <div className={`overflow-hidden rounded-sm flex items-center justify-center ${className}`}>
        {fallback}
      </div>
    );
  }

  if (disabled) {
    return (
      <div className={`overflow-hidden rounded-sm ${className}`}>
        <img src={src} alt={alt} className="w-full h-full object-cover" onError={handleError} />
      </div>
    );
  }

  const [fx, fy, fs] = from.split(" ");
  const [tx, ty, ts] = to.split(" ");

  return (
    <div className={`overflow-hidden rounded-sm ${className}`}>
      <style>{`
        @keyframes motionImage-${index} {
          0% { transform: translate(${fx}, ${fy}) scale(${fs}); }
          100% { transform: translate(${tx}, ${ty}) scale(${ts}); }
        }
        .motion-image-inner-${index} {
          animation: motionImage-${index} ${duration}s ease-in-out infinite alternate;
        }
        .motion-image-inner-${index}:hover {
          animation-play-state: paused;
        }
      `}</style>
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover motion-reduce:animate-none motion-reduce:transform-none motion-image-inner-${index}`}
        style={{ willChange: "transform" }}
        onError={handleError}
      />
    </div>
  );
}
