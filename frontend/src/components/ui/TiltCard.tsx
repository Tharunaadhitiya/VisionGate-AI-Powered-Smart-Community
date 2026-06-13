'use client';
import { useRef, useCallback } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
}

export default function TiltCard({
  children,
  className = '',
  maxTilt = 5,
  perspective = 600,
  scale = 1.02,
  speed = 400,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const apply = useCallback((rotX: number, rotY: number, z: number, s: number, transition: string) => {
    if (!ref.current) return;
    ref.current.style.transition = transition;
    ref.current.style.transform = `perspective(${perspective}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${s},${s},${s}) translateZ(${z}px)`;
  }, [perspective]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    apply(
      (y - 0.5) * -maxTilt * 2,
      (x - 0.5) * maxTilt * 2,
      28,
      scale,
      'transform 0.06s ease-out',
    );
  }, [maxTilt, scale, apply]);

  const handleMouseEnter = useCallback(() => {
    apply(0, 0, 28, scale, `transform ${speed * 0.3}ms ease-out`);
  }, [scale, speed, apply]);

  const handleMouseLeave = useCallback(() => {
    apply(0, 0, 8, 1, `transform ${speed}ms ease-out`);
  }, [speed, apply]);

  const handleMouseDown = useCallback(() => {
    apply(0, 0, 4, 0.98, 'transform 0.06s ease-out');
  }, [apply]);

  const handleMouseUp = useCallback(() => {
    apply(0, 0, 28, scale, 'transform 0.15s ease-out');
  }, [scale, apply]);

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        transform: `perspective(${perspective}px) translateZ(8px)`,
        touchAction: 'manipulation',
      }}
    >
      {children}
    </div>
  );
}
