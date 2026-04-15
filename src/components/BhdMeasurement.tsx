'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, RotateCcw, Loader2, ZoomIn } from 'lucide-react';
import { detectCardMarkers, type CardDetectionResult } from '@/lib/card-detection';
import { useTranslations } from 'next-intl';

/**
 * BHD measurement — redesigned with draggable lines + pinch-to-zoom.
 *
 * Instead of tapping points (finger covers target), the user drags
 * vertical lines to the edges. Pinch-to-zoom for precision.
 *
 * Two modes:
 * 1. Auto (Messkarte detected) → 2 lines for trunk edges
 * 2. Manual (credit card) → 2 lines for card edges, then 2 for trunk
 */

const CARD_LONG_MM = 85.6;
const CARD_SHORT_MM = 54.0;

type Mode = 'detecting' | 'auto' | 'manual';
type Phase = 'card' | 'trunk' | 'result';

interface Props {
  photoSrc: string;
  onMeasured: (bhdCm: number) => void;
  onSkip: () => void;
}

export function BhdMeasurement({ photoSrc, onMeasured, onSkip }: Props) {
  const m = useTranslations('MobileApp');
  const [mode, setMode] = useState<Mode>('detecting');
  const [phase, setPhase] = useState<Phase>('card');
  const [cardResult, setCardResult] = useState<CardDetectionResult | null>(null);
  const [cardMm, setCardMm] = useState(CARD_LONG_MM);
  const [bhdValue, setBhdValue] = useState<number | null>(null);

  // Line positions in image coordinates (x position on image)
  const [cardLineL, setCardLineL] = useState<number>(0);
  const [cardLineR, setCardLineR] = useState<number>(0);
  const [trunkLineL, setTrunkLineL] = useState<number>(0);
  const [trunkLineR, setTrunkLineR] = useState<number>(0);

  // Zoom & pan
  const [zoomScale, setZoomScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Dragging state
  const [dragging, setDragging] = useState<'cardL' | 'cardR' | 'trunkL' | 'trunkR' | null>(null);

  // Pinch state
  const lastPinchDist = useRef<number | null>(null);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgSizeRef = useRef<{ w: number; h: number }>({ w: 1, h: 1 });

  // Auto-detect markers when image loads
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const run = () => {
      imgSizeRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      const result = detectCardMarkers(img);
      setCardResult(result);

      const iw = img.naturalWidth;
      const center = iw / 2;
      const spread = iw * 0.1;

      if (result.found) {
        setMode('auto');
        setPhase('trunk');
        // Initialize trunk lines near center
        setTrunkLineL(center - spread);
        setTrunkLineR(center + spread);
      } else {
        setMode('manual');
        setPhase('card');
        // Initialize card lines near center
        setCardLineL(center - spread * 0.3);
        setCardLineR(center + spread * 0.3);
        setTrunkLineL(center - spread);
        setTrunkLineR(center + spread);
      }
    };
    if (img.complete && img.naturalWidth > 0) run();
    else img.onload = run;
  }, [photoSrc]);

  // Image bounds accounting for zoom/pan
  const getImageBounds = useCallback(() => {
    const container = containerRef.current;
    if (!container) return null;
    const cw = container.clientWidth, ch = container.clientHeight;
    const { w: iw, h: ih } = imgSizeRef.current;
    if (!iw || !ih) return null;
    const baseScale = Math.min(cw / iw, ch / ih);
    const scale = baseScale * zoomScale;
    const ox = (cw - iw * scale) / 2 + panX;
    const oy = (ch - ih * scale) / 2 + panY;
    return { ox, oy, scale, baseScale };
  }, [zoomScale, panX, panY]);

  // Convert screen X to image X
  const screenToImageX = useCallback((screenX: number) => {
    const bounds = getImageBounds();
    if (!bounds) return 0;
    const rect = containerRef.current!.getBoundingClientRect();
    return (screenX - rect.left - bounds.ox) / bounds.scale;
  }, [getImageBounds]);

  // Convert image X to screen X
  const imageToScreenX = useCallback((imgX: number) => {
    const bounds = getImageBounds();
    if (!bounds) return 0;
    return bounds.ox + imgX * bounds.scale;
  }, [getImageBounds]);

  // Draw everything
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
    const { h: ih } = imgSizeRef.current;
    const ch = container.clientHeight;

    const drawLine = (imgX: number, color: string, label: string, lineWidth = 2) => {
      const sx = ox + imgX * scale;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, ch);
      ctx.stroke();

      // Handle (draggable area indicator)
      const handleY = ch / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(sx - 14, handleY - 18, 28, 36, 6);
      ctx.fill();

      // Label on handle
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, sx, handleY + 4);
    };

    // Draw measurement area (shaded between active lines)
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

      // Dashed center line
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const cx = (lx + rx) / 2;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, ch); ctx.stroke();
      ctx.setLineDash([]);

      drawLine(trunkLineL, '#ef4444', 'L', phase === 'result' ? 3 : 2);
      drawLine(trunkLineR, '#3b82f6', 'R', phase === 'result' ? 3 : 2);
    }

    // Auto-detected markers
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
      [{ x: m1sx, y: m1sy }, { x: m2sx, y: m2sy }].forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF00FF'; ctx.lineWidth = 2; ctx.stroke();
      });
    }
  }, [mode, phase, cardResult, cardLineL, cardLineR, trunkLineL, trunkLineR, getImageBounds]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  // Calculate BHD from current line positions
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

  // Find which line is nearest to touch point
  function findNearestLine(screenX: number): typeof dragging {
    const bounds = getImageBounds();
    if (!bounds) return null;

    const threshold = 40; // px touch area
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
    } else {
      // Start pan
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragging) {
      const imgX = screenToImageX(e.clientX);
      const clamped = Math.max(0, Math.min(imgSizeRef.current.w, imgX));
      switch (dragging) {
        case 'cardL': setCardLineL(clamped); break;
        case 'cardR': setCardLineR(clamped); break;
        case 'trunkL': setTrunkLineL(clamped); break;
        case 'trunkR': setTrunkLineR(clamped); break;
      }
      e.preventDefault();
    } else if (lastPanPos.current && e.pointerType !== 'touch') {
      // Pan with mouse drag
      setPanX(prev => prev + e.clientX - lastPanPos.current!.x);
      setPanY(prev => prev + e.clientY - lastPanPos.current!.y);
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    }
  }

  function handlePointerUp() {
    setDragging(null);
    lastPanPos.current = null;
  }

  // Pinch-to-zoom for touch
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastPinchDist.current != null) {
        const delta = dist / lastPinchDist.current;
        setZoomScale(prev => Math.max(1, Math.min(8, prev * delta)));
      }
      lastPinchDist.current = dist;

      // Pan with two fingers
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (lastPanPos.current) {
        setPanX(prev => prev + cx - lastPanPos.current!.x);
        setPanY(prev => prev + cy - lastPanPos.current!.y);
      }
      lastPanPos.current = { x: cx, y: cy };
    }
  }

  function handleTouchEnd() {
    lastPinchDist.current = null;
    lastPanPos.current = null;
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
    setZoomScale(1);
    setPanX(0);
    setPanY(0);
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
        <div className="flex items-center gap-2">
          {zoomScale > 1 && (
            <button onClick={() => { setZoomScale(1); setPanX(0); setPanY(0); }}
              className="text-slate-500 hover:text-white text-xs px-2 py-1 rounded border border-slate-700">
              1x
            </button>
          )}
          <button onClick={onSkip} className="text-slate-400 hover:text-white p-1"><X size={20} /></button>
        </div>
      </div>

      {/* Instruction */}
      <div className="shrink-0 px-4 py-2 text-center min-h-[48px]">
        {mode === 'detecting' && (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 size={14} className="animate-spin" /> {m('searchingCard')}
          </div>
        )}
        {!isResult && mode !== 'detecting' && (
          <div className="space-y-1">
            {phase === 'card' && (
              <p className="text-sm text-yellow-400">
                {m('slideK1K2')}
              </p>
            )}
            {phase === 'trunk' && (
              <p className="text-sm text-emerald-400">
                {m('slideLR')}
              </p>
            )}
            <p className="text-xs text-slate-600 flex items-center justify-content gap-1">
              <ZoomIn size={10} /> {m('pinchZoom')}
            </p>
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
        <img ref={imgRef} src={photoSrc} alt="Baum"
          style={{
            position: 'absolute',
            width: '100%', height: '100%',
            objectFit: 'contain',
            transform: `scale(${zoomScale}) translate(${panX / zoomScale}px, ${panY / zoomScale}px)`,
            transformOrigin: 'center center',
            pointerEvents: 'none',
          }}
          onLoad={draw}
        />
        <canvas ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
