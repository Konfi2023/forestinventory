'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Check } from 'lucide-react';

interface RotaryTunerProps {
  value: number;
  onChange: (value: number) => void;
  onConfirm: () => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  label: string;
  color?: string;
  decimals?: number;
}

export function RotaryTuner({
  value, onChange, onConfirm,
  min, max, step, unit, label,
  color = '#10b981',
  decimals = 0,
}: RotaryTunerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const accumulated = useRef(0);
  const [, forceRender] = useState(0);

  // Pixels per step — how many px the user must drag to change one step
  const pxPerStep = 12;

  // Total steps for rendering
  const totalSteps = Math.round((max - min) / step);

  // Width of the full ruler in px
  const rulerWidth = totalSteps * pxPerStep;

  // Current position (centered on value)
  const valuePosition = ((value - min) / step) * pxPerStep;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    lastX.current = e.clientX;
    accumulated.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = lastX.current - e.clientX; // inverted: drag left = increase
    lastX.current = e.clientX;
    accumulated.current += deltaX;

    const stepChanges = Math.floor(accumulated.current / pxPerStep);
    if (stepChanges !== 0) {
      accumulated.current -= stepChanges * pxPerStep;
      const newValue = Math.max(min, Math.min(max,
        Number((value + stepChanges * step).toFixed(decimals))
      ));
      if (newValue !== value) {
        onChange(newValue);
        if (navigator.vibrate) navigator.vibrate(2);
      }
    }
  }, [min, max, value, step, decimals, onChange]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Generate tick marks for visible range
  const renderTicks = () => {
    const track = trackRef.current;
    if (!track) return null;
    const trackWidth = track.clientWidth;
    const centerOffset = trackWidth / 2;

    // How many steps to render on each side
    const visibleSteps = Math.ceil(trackWidth / pxPerStep) + 4;
    const startStep = Math.max(0, Math.round((value - min) / step) - visibleSteps);
    const endStep = Math.min(totalSteps, Math.round((value - min) / step) + visibleSteps);

    const ticks = [];
    // Decide major tick interval based on step size
    let majorEvery = 10;
    if (step >= 5) majorEvery = 2;
    if (step === 0.5) majorEvery = 2; // every 1.0

    for (let i = startStep; i <= endStep; i++) {
      const tickValue = min + i * step;
      const px = centerOffset + (i * pxPerStep - valuePosition);
      const isMajor = i % majorEvery === 0;

      ticks.push(
        <div
          key={i}
          className="absolute flex flex-col items-center"
          style={{
            left: px,
            transform: 'translateX(-50%)',
            transition: isDragging.current ? 'none' : 'left 0.05s',
          }}
        >
          <div
            style={{
              width: isMajor ? 2 : 1,
              height: isMajor ? 32 : 18,
              backgroundColor: isMajor ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)',
              borderRadius: 1,
            }}
          />
          {isMajor && (
            <span className="text-[10px] text-slate-400 mt-1 select-none font-medium">
              {tickValue.toFixed(decimals)}
            </span>
          )}
        </div>
      );
    }
    return ticks;
  };

  // Force re-render on mount to get trackRef dimensions
  useEffect(() => { forceRender(n => n + 1); }, []);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Label */}
      <p className="text-sm font-medium text-slate-500">{label}</p>

      {/* Value display */}
      <div className="text-center">
        <span className="text-6xl font-bold" style={{ color }}>
          {value.toFixed(decimals)}
        </span>
        <span className="text-2xl font-light text-slate-400 ml-2">{unit}</span>
      </div>

      {/* Ruler */}
      <div className="w-full relative">
        {/* Center indicator */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
          style={{ width: 3, height: 44, backgroundColor: color, borderRadius: 2 }}
        />
        {/* Small triangle pointer */}
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-10"
          style={{
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `8px solid ${color}`,
          }}
        />

        {/* Scrollable track */}
        <div
          ref={trackRef}
          className="relative w-full overflow-hidden select-none"
          style={{ height: 60, touchAction: 'none', cursor: 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Fade edges */}
          <div className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, rgb(249 250 251), transparent)' }} />
          <div className="absolute inset-y-0 right-0 w-16 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, rgb(249 250 251), transparent)' }} />

          {/* Ticks */}
          <div className="absolute inset-0 pt-2">
            {renderTicks()}
          </div>
        </div>
      </div>

      {/* OK button */}
      <button
        onClick={onConfirm}
        className="w-full max-w-xs py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        style={{ background: color, boxShadow: `0 4px 20px ${color}40` }}
      >
        <Check size={22} strokeWidth={3} />
        OK
      </button>
    </div>
  );
}
