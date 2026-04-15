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
  const startAngleRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);
  const lastStepRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  // Value to angle: map value range to 0-300 degrees (leave 60 deg gap at bottom)
  const valueToAngle = useCallback((v: number) => {
    const range = max - min;
    if (range <= 0) return 0;
    return ((v - min) / range) * 300 - 150; // -150 to +150
  }, [min, max]);

  const angleToValue = useCallback((angle: number) => {
    const range = max - min;
    const raw = ((angle + 150) / 300) * range + min;
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, Number(stepped.toFixed(decimals))));
  }, [min, max, step, decimals]);

  const getAngleFromEvent = useCallback((clientX: number, clientY: number) => {
    const knob = knobRef.current;
    if (!knob) return 0;
    const rect = knob.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startAngleRef.current = getAngleFromEvent(e.clientX, e.clientY);
    startValueRef.current = value;
    lastStepRef.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [getAngleFromEvent, value]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const currentAngle = getAngleFromEvent(e.clientX, e.clientY);
    let delta = currentAngle - startAngleRef.current;

    // Handle wrap-around
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const range = max - min;
    const valueDelta = (delta / 300) * range;
    const newValue = angleToValue(startValueRef.current + valueDelta);

    if (newValue !== value) {
      onChange(newValue);
      // Haptic feedback on step change
      if (Math.abs(newValue - lastStepRef.current) >= step) {
        lastStepRef.current = newValue;
        if (navigator.vibrate) navigator.vibrate(5);
      }
    }
  }, [isDragging, getAngleFromEvent, max, min, angleToValue, onChange, value, step]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const angle = valueToAngle(value);
  const progress = (value - min) / (max - min);

  // SVG arc for progress
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (300 / 360) * circumference;
  const progressLength = progress * arcLength;

  // Tick marks
  const totalSteps = Math.floor((max - min) / step);
  const tickInterval = totalSteps > 60 ? 10 : totalSteps > 30 ? 5 : 1;
  const majorTickInterval = tickInterval * (totalSteps > 60 ? 5 : totalSteps > 30 ? 2 : 5);

  return (
    <div className="flex flex-col items-center gap-4">
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
        {/* Background circle */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
          {/* Track */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeDashoffset={-circumference * (210 / 360)}
            transform="rotate(0 100 100)"
          />
          {/* Progress */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${progressLength} ${circumference - progressLength}`}
            strokeDashoffset={-circumference * (210 / 360)}
            transform="rotate(0 100 100)"
            style={{ transition: isDragging ? 'none' : 'stroke-dasharray 0.1s' }}
          />

          {/* Tick marks */}
          {Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => {
            if (i % tickInterval !== 0) return null;
            const isMajor = i % majorTickInterval === 0;
            const tickAngle = (i / totalSteps) * 300 - 150 + 90;
            const innerR = isMajor ? 72 : 76;
            const outerR = 80;
            const rad = (tickAngle * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={100 + innerR * Math.cos(rad)}
                y1={100 + innerR * Math.sin(rad)}
                x2={100 + outerR * Math.cos(rad)}
                y2={100 + outerR * Math.sin(rad)}
                stroke={isMajor ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.08)'}
                strokeWidth={isMajor ? 1.5 : 1}
              />
            );
          })}

          {/* Indicator dot on the arc */}
          {(() => {
            const indicatorAngle = ((angle + 90) * Math.PI) / 180;
            return (
              <circle
                cx={100 + radius * Math.cos(indicatorAngle)}
                cy={100 + radius * Math.sin(indicatorAngle)}
                r="8"
                fill={color}
                stroke="white"
                strokeWidth="3"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}
              />
            );
          })()}
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

      {/* Min/Max labels */}
      <div className="flex justify-between w-56 text-xs text-slate-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
