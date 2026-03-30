'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { loadOpenCv } from '@/lib/opencv-loader';
import { detectCreditCard, calculateBhd, type CardDetectionResult } from '@/lib/bhd-measurement';

type Phase = 'loading' | 'detecting' | 'card-found' | 'card-not-found' | 'tap-1' | 'tap-2' | 'result';

interface Props {
  photoSrc: string; // DataURL or object URL of the photo
  onMeasured: (bhdCm: number) => void;
  onSkip: () => void;
}

export function BhdMeasurement({ photoSrc, onMeasured, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [cardResult, setCardResult] = useState<CardDetectionResult | null>(null);
  const [tap1, setTap1] = useState<{ x: number; y: number } | null>(null);
  const [tap2, setTap2] = useState<{ x: number; y: number } | null>(null);
  const [bhdValue, setBhdValue] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Load OpenCV and detect card
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setPhase('loading');
        const cv = await loadOpenCv();
        if (cancelled) return;

        // Wait for image to load
        const img = imgRef.current;
        if (!img) return;
        await new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.onload = () => resolve();
        });
        if (cancelled) return;

        setPhase('detecting');
        const result = detectCreditCard(cv, img);
        if (cancelled) return;

        setCardResult(result);
        setPhase(result.found ? 'card-found' : 'card-not-found');

        if (result.found) {
          // Auto-advance to tap mode after showing card detection briefly
          setTimeout(() => { if (!cancelled) setPhase('tap-1'); }, 800);
        }
      } catch {
        if (!cancelled) setPhase('card-not-found');
      }
    }

    run();
    return () => { cancelled = true; };
  }, [photoSrc]);

  // Draw overlay on canvas
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const scaleX = rect.width / img.naturalWidth;
    const scaleY = rect.height / img.naturalHeight;

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw card outline
    if (cardResult?.found && cardResult.corners.length === 4) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const c = cardResult.corners;
      ctx.moveTo(c[0].x * scaleX, c[0].y * scaleY);
      for (let i = 1; i < 4; i++) ctx.lineTo(c[i].x * scaleX, c[i].y * scaleY);
      ctx.closePath();
      ctx.stroke();
    }

    // Draw tap points
    const drawPoint = (p: { x: number; y: number }, color: string, label: string) => {
      const px = p.x * scaleX;
      const py = p.y * scaleY;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'white';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, px, py - 14);
    };

    if (tap1) drawPoint(tap1, '#ef4444', 'L');
    if (tap2) drawPoint(tap2, '#3b82f6', 'R');

    // Draw line between taps
    if (tap1 && tap2) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(tap1.x * scaleX, tap1.y * scaleY);
      ctx.lineTo(tap2.x * scaleX, tap2.y * scaleY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [cardResult, tap1, tap2]);

  useEffect(() => { drawOverlay(); }, [drawOverlay, phase]);

  // Handle tap on image
  function handleTap(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (phase !== 'tap-1' && phase !== 'tap-2') return;
    if (!canvasRef.current || !imgRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Convert screen coords to image coords
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    const imgX = (clientX - rect.left) * scaleX;
    const imgY = (clientY - rect.top) * scaleY;
    const point = { x: imgX, y: imgY };

    if (phase === 'tap-1') {
      setTap1(point);
      setPhase('tap-2');
    } else if (phase === 'tap-2' && cardResult?.pixelsPerMm) {
      setTap2(point);
      const result = calculateBhd(tap1!, point, cardResult.pixelsPerMm);
      setBhdValue(result.bhdCm);
      setPhase('result');
    }
  }

  function reset() {
    setTap1(null);
    setTap2(null);
    setBhdValue(null);
    setPhase(cardResult?.found ? 'tap-1' : 'card-not-found');
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-black/50">
        <h3 className="text-white text-sm font-semibold">BHD-Messung</h3>
        <button onClick={onSkip} className="text-slate-400 hover:text-white p-1">
          <X size={20} />
        </button>
      </div>

      {/* Status bar */}
      <div className="shrink-0 px-4 py-2 text-center">
        {phase === 'loading' && (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 size={14} className="animate-spin" /> OpenCV wird geladen…
          </div>
        )}
        {phase === 'detecting' && (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 size={14} className="animate-spin" /> Kreditkarte wird gesucht…
          </div>
        )}
        {phase === 'card-found' && (
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
            <Check size={14} /> Karte erkannt
          </div>
        )}
        {phase === 'card-not-found' && (
          <div className="flex items-center justify-center gap-2 text-amber-400 text-sm">
            <AlertTriangle size={14} /> Keine Karte erkannt
          </div>
        )}
        {phase === 'tap-1' && (
          <p className="text-white text-sm">Tippe auf den <span className="text-red-400 font-semibold">linken Stammrand</span></p>
        )}
        {phase === 'tap-2' && (
          <p className="text-white text-sm">Tippe auf den <span className="text-blue-400 font-semibold">rechten Stammrand</span></p>
        )}
        {phase === 'result' && bhdValue != null && (
          <div className="text-emerald-400 text-lg font-bold">
            BHD: {bhdValue} cm
          </div>
        )}
      </div>

      {/* Image + canvas overlay */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={photoSrc}
          alt="Baum"
          className="max-w-full max-h-full object-contain"
          style={{ position: 'absolute', inset: 0, margin: 'auto', width: '100%', height: '100%', objectFit: 'contain' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
          onClick={handleTap}
          onTouchStart={(e) => { e.preventDefault(); handleTap(e); }}
        />
      </div>

      {/* Actions */}
      <div className="shrink-0 px-4 py-4 flex gap-3">
        {phase === 'card-not-found' && (
          <button onClick={onSkip}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition-colors">
            Ohne Messung weiter
          </button>
        )}
        {phase === 'result' && (
          <>
            <button onClick={reset}
              className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
              <RotateCcw size={14} /> Neu
            </button>
            <button onClick={() => bhdValue != null && onMeasured(bhdValue)}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <Check size={14} /> {bhdValue} cm übernehmen
            </button>
          </>
        )}
        {(phase === 'tap-1' || phase === 'tap-2') && (
          <button onClick={reset}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <RotateCcw size={14} /> Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}
