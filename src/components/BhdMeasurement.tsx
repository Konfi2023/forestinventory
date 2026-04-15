'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, RotateCcw, Loader2 } from 'lucide-react';
import { detectCardMarkers, type CardDetectionResult } from '@/lib/card-detection';

const CARD_LONG_MM = 85.6;
const CARD_SHORT_MM = 54.0;

type Mode = 'detecting' | 'auto' | 'manual';
type Phase = 'card' | 'trunk' | 'result';

interface Point { x: number; y: number }
interface Props {
  photoSrc: string;
  onMeasured: (bhdCm: number) => void;
  onSkip: () => void;
  t: (key: string) => string;
}

export function BhdMeasurement({ photoSrc, onMeasured, onSkip, t: m }: Props) {
  const [mode, setMode] = useState<Mode>('detecting');
  const [phase, setPhase] = useState<Phase>('card');
  const [cardResult, setCardResult] = useState<CardDetectionResult | null>(null);
  const [cardMm, setCardMm] = useState(CARD_LONG_MM);
  const [bhdValue, setBhdValue] = useState<number | null>(null);

  const [cardLineL, setCardLineL] = useState<number>(0);
  const [cardLineR, setCardLineR] = useState<number>(0);
  const [trunkLineL, setTrunkLineL] = useState<number>(0);
  const [trunkLineR, setTrunkLineR] = useState<number>(0);

  const [dragging, setDragging] = useState<'cardL' | 'cardR' | 'trunkL' | 'trunkR' | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgSizeRef = useRef<{ w: number; h: number }>({ w: 1, h: 1 });
  const imgLoadedRef = useRef(false);

  // Detect markers when image loads
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const run = () => {
      imgSizeRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      imgLoadedRef.current = true;

      const iw = img.naturalWidth;
      const center = iw / 2;
      const spread = iw * 0.1;

      // Initialize lines immediately so something is visible
      setTrunkLineL(center - spread);
      setTrunkLineR(center + spread);
      setCardLineL(center - spread * 0.3);
      setCardLineR(center + spread * 0.3);

      // Defer marker detection so the image renders first
      requestAnimationFrame(() => {
        const result = detectCardMarkers(img);
        setCardResult(result);
        if (result.found) {
          setPhase('trunk');
          setMode('auto');
        } else {
          setPhase('card');
          setMode('manual');
        }
      });
    };
    if (img.complete && img.naturalWidth > 0) run();
    else img.onload = run;
  }, [photoSrc]);

  const getImageBounds = useCallback(() => {
    const container = containerRef.current;
    if (!container) return null;
    const cw = container.clientWidth, ch = container.clientHeight;
    const { w: iw, h: ih } = imgSizeRef.current;
    if (!iw || !ih) return null;
    const scale = Math.min(cw / iw, ch / ih);
    const ox = (cw - iw * scale) / 2;
    const oy = (ch - ih * scale) / 2;
    return { ox, oy, scale };
  }, []);

  const screenToImageX = useCallback((screenX: number) => {
    const bounds = getImageBounds();
    if (!bounds) return 0;
    const rect = containerRef.current!.getBoundingClientRect();
    return (screenX - rect.left - bounds.ox) / bounds.scale;
  }, [getImageBounds]);

  const imageToScreenX = useCallback((imgX: number) => {
    const bounds = getImageBounds();
    if (!bounds) return 0;
    return bounds.ox + imgX * bounds.scale;
  }, [getImageBounds]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const bounds = getImageBounds();
    const container = containerRef.current;
    if (!canvas || !bounds || !container) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, container.clientWidth, container.clientHeight);

    const { ox, oy, scale } = bounds;
    const ch = container.clientHeight;

    const drawLine = (imgX: number, color: string, label: string) => {
      const sx = ox + imgX * scale;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, ch);
      ctx.stroke();

      const handleY = ch / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(sx - 14, handleY - 18, 28, 36, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, sx, handleY + 4);
    };

    if (phase === 'card' && mode === 'manual') {
      const lx = ox + cardLineL * scale;
      const rx = ox + cardLineR * scale;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.1)';
      ctx.fillRect(lx, 0, rx - lx, ch);
      drawLine(cardLineL, '#facc15', 'K1');
      drawLine(cardLineR, '#facc15', 'K2');
    }

    if (phase === 'trunk' || phase === 'result') {
      const lx = ox + trunkLineL * scale;
      const rx = ox + trunkLineR * scale;
      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.fillRect(lx, 0, rx - lx, ch);
      drawLine(trunkLineL, '#ef4444', 'L');
      drawLine(trunkLineR, '#3b82f6', 'R');
    }

    if (mode === 'auto' && cardResult?.found) {
      const m1sx = ox + cardResult.marker1.x * scale;
      const m1sy = oy + cardResult.marker1.y * scale;
      const m2sx = ox + cardResult.marker2.x * scale;
      const m2sy = oy + cardResult.marker2.y * scale;
      ctx.strokeStyle = '#FF00FF';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(m1sx, m1sy); ctx.lineTo(m2sx, m2sy); ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [mode, phase, cardResult, cardLineL, cardLineR, trunkLineL, trunkLineR, getImageBounds]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  function calculateBhd() {
    let pxPerMm: number;
    if (mode === 'auto' && cardResult?.found) {
      pxPerMm = cardResult.pixelsPerMm;
    } else {
      const cardDist = Math.abs(cardLineR - cardLineL);
      pxPerMm = cardDist / cardMm;
    }
    const trunkDist = Math.abs(trunkLineR - trunkLineL);
    return Math.round(trunkDist / pxPerMm / 10);
  }

  function findNearestLine(screenX: number): typeof dragging {
    const threshold = 40;
    const lines: { id: typeof dragging; sx: number }[] = [];

    if (phase === 'card' && mode === 'manual') {
      lines.push({ id: 'cardL', sx: imageToScreenX(cardLineL) });
      lines.push({ id: 'cardR', sx: imageToScreenX(cardLineR) });
    }
    if (phase === 'trunk') {
      lines.push({ id: 'trunkL', sx: imageToScreenX(trunkLineL) });
      lines.push({ id: 'trunkR', sx: imageToScreenX(trunkLineR) });
    }

    let nearest: typeof dragging = null;
    let minDist = threshold;
    for (const l of lines) {
      const dist = Math.abs(screenX - l.sx);
      if (dist < minDist) { minDist = dist; nearest = l.id; }
    }
    return nearest;
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (phase === 'result') return;
    const line = findNearestLine(e.clientX);
    if (line) {
      setDragging(line);
      e.preventDefault();
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const imgX = screenToImageX(e.clientX);
    const clamped = Math.max(0, Math.min(imgSizeRef.current.w, imgX));
    switch (dragging) {
      case 'cardL': setCardLineL(clamped); break;
      case 'cardR': setCardLineR(clamped); break;
      case 'trunkL': setTrunkLineL(clamped); break;
      case 'trunkR': setTrunkLineR(clamped); break;
    }
    e.preventDefault();
  }

  function handlePointerUp() {
    setDragging(null);
  }

  function confirmPhase() {
    if (phase === 'card') {
      setPhase('trunk');
    } else if (phase === 'trunk') {
      const bhd = calculateBhd();
      setBhdValue(bhd);
      setPhase('result');
    }
  }

  function reset() {
    setBhdValue(null);
    const iw = imgSizeRef.current.w;
    const center = iw / 2;
    const spread = iw * 0.1;
    setTrunkLineL(center - spread);
    setTrunkLineR(center + spread);
    setCardLineL(center - spread * 0.3);
    setCardLineR(center + spread * 0.3);
    setCardMm(CARD_LONG_MM);
    if (cardResult?.found) { setPhase('trunk'); }
    else { setPhase('card'); }
  }

  function toggleCardSide() {
    const newMm = cardMm === CARD_LONG_MM ? CARD_SHORT_MM : CARD_LONG_MM;
    setCardMm(newMm);
    if (phase === 'result') {
      let pxPerMm: number;
      if (mode === 'auto' && cardResult?.found) {
        pxPerMm = cardResult.pixelsPerMm;
      } else {
        pxPerMm = Math.abs(cardLineR - cardLineL) / newMm;
      }
      const trunkDist = Math.abs(trunkLineR - trunkLineL);
      setBhdValue(Math.round(trunkDist / pxPerMm / 10));
    }
  }

  const isResult = phase === 'result';

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-white text-sm font-semibold">{m('bhdMeasure')}</h3>
          <p className="text-slate-500 text-xs">
            {mode === 'detecting' && m('searchingCard')}
            {mode === 'auto' && phase === 'trunk' && m('slideTrunkEdges')}
            {mode === 'manual' && phase === 'card' && m('slideCardEdges')}
            {mode === 'manual' && phase === 'trunk' && m('slideTrunkEdges')}
            {isResult && `${m('bhd')} ${bhdValue} cm`}
          </p>
        </div>
        <button onClick={onSkip} className="text-slate-400 hover:text-white p-1"><X size={20} /></button>
      </div>

      {/* Instruction */}
      <div className="shrink-0 px-4 py-2 text-center min-h-[48px]">
        {mode === 'detecting' && (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 size={14} className="animate-spin" /> {m('searchingCard')}
          </div>
        )}
        {!isResult && mode !== 'detecting' && (
          <div>
            {phase === 'card' && (
              <p className="text-sm text-yellow-400">{m('slideK1K2')}</p>
            )}
            {phase === 'trunk' && (
              <p className="text-sm text-emerald-400">{m('slideLR')}</p>
            )}
          </div>
        )}
        {isResult && (
          <div className="text-emerald-400">
            <p className="text-3xl font-bold">{bhdValue} cm</p>
            <p className="text-xs text-emerald-500 mt-0.5">
              {m('bhdMeasured')} {mode === 'auto' ? m('viaCard') : m('viaCreditCard')}
            </p>
          </div>
        )}
      </div>

      {/* Image + Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden"
        style={{ touchAction: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={photoSrc} alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{ pointerEvents: 'none' }}
          onLoad={draw}
        />
        <canvas ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      {/* Actions */}
      <div className="shrink-0 px-4 py-3 space-y-2">
        {isResult && mode === 'manual' && (
          <button onClick={toggleCardSide}
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            {cardMm === CARD_LONG_MM ? m('refLong') : m('refShort')} — {m('refTapToSwitch')}
          </button>
        )}
        <div className="flex gap-3">
          {!isResult && (
            <>
              <button onClick={reset}
                className="py-3 px-4 bg-slate-800 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                <RotateCcw size={14} />
              </button>
              <button onClick={confirmPhase}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold">
                {phase === 'card' ? m('cardConfirmed') : m('calculateBhd')}
              </button>
            </>
          )}
          {isResult && (
            <>
              <button onClick={reset}
                className="py-3 px-4 bg-slate-800 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                <RotateCcw size={14} />
              </button>
              <button onClick={() => { setPhase('trunk'); setBhdValue(null); }}
                className="py-3 px-4 bg-slate-800 text-white rounded-xl text-sm font-medium">
                {m('correct')}
              </button>
              <button onClick={() => bhdValue != null && onMeasured(bhdValue)}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                <Check size={14} /> {bhdValue} cm
              </button>
            </>
          )}
        </div>
        {!isResult && (
          <button onClick={onSkip}
            className="w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors">
            {m('withoutMeasurement')}
          </button>
        )}
      </div>
    </div>
  );
}
