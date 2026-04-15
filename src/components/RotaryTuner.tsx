'use client';

import { useRef, useCallback, useState } from 'react';
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
  const knobRef = useRef<HTMLDivElement>(null);
  const prevAngleRef = useRef<number | null>(null);
  const accumulatedRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  // Sensitivity: degrees of rotation per step
  // Full rotation (360°) = sensSteps * step value change
  const sensSteps = 40; // 360° = 40 steps → ~9° per step
  const degreesPerStep = 360 / sensSteps;

  const getAngleFromEvent = useCallback((clientX: number, clientY: number) => {
    const knob = knobRef.current;
    if (!knob) return 0;
    const rect = knob.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Don't start drag on the OK button
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    prevAngleRef.current = getAngleFromEvent(e.clientX, e.clientY);
    accumulatedRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [getAngleFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || prevAngleRef.current === null) return;

    const currentAngle = getAngleFromEvent(e.clientX, e.clientY);
    let delta = currentAngle - prevAngleRef.current;

    // Handle wrap-around at ±180°
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    prevAngleRef.current = currentAngle;
    accumulatedRef.current += delta;

    // Convert accumulated degrees to step changes
    const stepChanges = Math.floor(accumulatedRef.current / degreesPerStep);
    if (stepChanges !== 0) {
      accumulatedRef.current -= stepChanges * degreesPerStep;
      const newValue = Math.max(min, Math.min(max,
        Number((value + stepChanges * step).toFixed(decimals))
      ));
      if (newValue !== value) {
        onChange(newValue);
        if (navigator.vibrate) navigator.vibrate(3);
      }
    }
  }, [isDragging, getAngleFromEvent, degreesPerStep, min, max, value, step, decimals, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    prevAngleRef.current = null;
  }, []);

  // Visual angle for the indicator (map value to 0-300° range)
  const progress = (value - min) / (max - min || 1);
  const indicatorAngle = progress * 300 - 150; // -150° to +150°

  // SVG arc
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (300 / 360) * circumference;
  const progressLength = progress * arcLength;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Label */}
      <p className="text-sm font-medium text-slate-500">{label}</p>

      {/* Value display */}
      <div className="text-center">
        <span className="text-5xl font-bold" style={{ color }}>
          {value.toFixed(decimals)}
        </span>
        <span className="text-2xl font-light text-slate-400 ml-2">{unit}</span>
      </div>

      {/* Knob */}
      <div
        ref={knobRef}
        className="relative w-56 h-56 select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
          {/* Track background */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeDashoffset={-circumference * (210 / 360)}
          />
          {/* Progress arc */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${progressLength} ${circumference - progressLength}`}
            strokeDashoffset={-circumference * (210 / 360)}
            style={{ transition: isDragging ? 'none' : 'stroke-dasharray 0.15s ease-out' }}
          />

          {/* Indicator dot */}
          {(() => {
            const rad = ((indicatorAngle + 90) * Math.PI) / 180;
            return (
              <circle
                cx={100 + radius * Math.cos(rad)}
                cy={100 + radius * Math.sin(rad)}
                r="10"
                fill="white"
                stroke={color}
                strokeWidth="4"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                  transition: isDragging ? 'none' : 'cx 0.15s, cy 0.15s',
                }}
              />
            );
          })()}

          {/* Min/Max labels on arc */}
          <text x="45" y="185" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="sans-serif">{min}</text>
          <text x="155" y="185" textAnchor="middle" fontSize="11" fill="#94a3b8" fontFamily="sans-serif">{max}</text>
        </svg>

        {/* OK button in center */}
        <button
          onClick={(e) => { e.stopPropagation(); onConfirm(); }}
          className="absolute inset-0 m-auto w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{
            background: color,
            boxShadow: `0 4px 20px ${color}40`,
          }}
        >
          <Check size={32} className="text-white" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
