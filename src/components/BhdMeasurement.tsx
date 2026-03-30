'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, RotateCcw, Loader2 } from 'lucide-react';
import { detectCardMarkers, type CardDetectionResult } from '@/lib/card-detection';

/**
 * BHD measurement — two modes:
 *
 * 1. WITH Forest Manager Messkarte (magenta markers detected):
 *    → Auto-scale from markers → user taps only 2 points (trunk edges)
 *
 * 2. WITHOUT Messkarte (any card or no card):
 *    → User taps 4 points: 2 on card edges + 2 on trunk edges
 */

const CARD_LONG_MM = 85.6;
const CARD_SHORT_MM = 54.0;

type Mode = 'detecting' | 'auto' | 'manual';
type AutoPhase = 'trunk-1' | 'trunk-2' | 'result';
type ManualPhase = 'card-1' | 'card-2' | 'trunk-1' | 'trunk-2' | 'result';

interface Point { x: number; y: number }
interface Props {
  photoSrc: string;
  onMeasured: (bhdCm: number) => void;
  onSkip: () => void;
}

export function BhdMeasurement({ photoSrc, onMeasured, onSkip }: Props) {
  const [mode, setMode] = useState<Mode>('detecting');
  const [autoPhase, setAutoPhase] = useState<AutoPhase>('trunk-1');
  const [manualPhase, setManualPhase] = useState<ManualPhase>('card-1');
  const [cardResult, setCardResult] = useState<CardDetectionResult | null>(null);

  const [card1, setCard1] = useState<Point | null>(null);
  const [card2, setCard2] = useState<Point | null>(null);
  const [trunk1, setTrunk1] = useState<Point | null>(null);
  const [trunk2, setTrunk2] = useState<Point | null>(null);
  const [bhdValue, setBhdValue] = useState<number | null>(null);
  const [cardMm, setCardMm] = useState(CARD_LONG_MM);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-detect markers when image loads
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const run = () => {
      const result = detectCardMarkers(img);
      setCardResult(result);
      if (result.found) {
        setMode('auto');
        setAutoPhase('trunk-1');
      } else {
        setMode('manual');
        setManualPhase('card-1');
      }
    };
    if (img.complete && img.naturalWidth > 0) run();
    else img.onload = run;
  }, [photoSrc]);

  const getImageBounds = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return null;
    const cw = container.clientWidth, ch = container.clientHeight;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) return null;
    const scale = Math.min(cw / iw, ch / ih);
    return { ox: (cw - iw * scale) / 2, oy: (ch - ih * scale) / 2, scale };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const bounds = getImageBounds();
    if (!canvas || !bounds) return;
    const container = containerRef.current!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, container.clientWidth, container.clientHeight);

    const { ox, oy, scale } = bounds;
    const toS = (p: Point) => ({ x: ox + p.x * scale, y: oy + p.y * scale });

    const dot = (p: Point, color: string, label: string, size = 10) => {
      const s = toS(p);
      ctx.beginPath(); ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, s.x, s.y - size - 5);
    };

    const line = (a: Point, b: Point, color: string, dash = false) => {
      const sa = toS(a), sb = toS(b);
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.setLineDash(dash ? [6, 4] : []);
      ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke();
      ctx.setLineDash([]);
    };

    // Auto-detected markers
    if (mode === 'auto' && cardResult?.found) {
      dot(cardResult.marker1, '#FF00FF', '', 8);
      dot(cardResult.marker2, '#FF00FF', '', 8);
      line(cardResult.marker1, cardResult.marker2, 'rgba(255,0,255,0.3)');
    }

    // Manual card points
    if (mode === 'manual') {
      if (card1) dot(card1, '#facc15', 'K1');
      if (card2) dot(card2, '#facc15', 'K2');
      if (card1 && card2) line(card1, card2, '#facc15');
    }

    // Trunk points
    if (trunk1) dot(trunk1, '#ef4444', 'L');
    if (trunk2) dot(trunk2, '#3b82f6', 'R');
    if (trunk1 && trunk2) line(trunk1, trunk2, '#22c55e', true);
  }, [mode, cardResult, card1, card2, trunk1, trunk2, getImageBounds]);

  useEffect(() => { draw(); }, [draw, autoPhase, manualPhase]);
  useEffect(() => { window.addEventListener('resize', draw); return () => window.removeEventListener('resize', draw); }, [draw]);

  function calcBhd(pxPerMm: number, t1: Point, t2: Point) {
    const trunkDist = Math.sqrt((t2.x - t1.x) ** 2 + (t2.y - t1.y) ** 2);
    return Math.round(trunkDist / pxPerMm / 10); // mm → cm
  }

  function handleTap(e: React.PointerEvent) {
    const bounds = getImageBounds();
    if (!bounds) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const { ox, oy, scale } = bounds;
    const p = { x: (e.clientX - rect.left - ox) / scale, y: (e.clientY - rect.top - oy) / scale };

    if (mode === 'auto') {
      if (autoPhase === 'trunk-1') { setTrunk1(p); setAutoPhase('trunk-2'); }
      else if (autoPhase === 'trunk-2') {
        setTrunk2(p);
        setBhdValue(calcBhd(cardResult!.pixelsPerMm, trunk1!, p));
        setAutoPhase('result');
      }
    } else if (mode === 'manual') {
      if (manualPhase === 'card-1') { setCard1(p); setManualPhase('card-2'); }
      else if (manualPhase === 'card-2') { setCard2(p); setManualPhase('trunk-1'); }
      else if (manualPhase === 'trunk-1') { setTrunk1(p); setManualPhase('trunk-2'); }
      else if (manualPhase === 'trunk-2') {
        setTrunk2(p);
        const cardDist = Math.sqrt((card2!.x - card1!.x) ** 2 + (card2!.y - card1!.y) ** 2);
        setBhdValue(calcBhd(cardDist / cardMm, trunk1!, p));
        setManualPhase('result');
      }
    }
  }

  function toggleCardSide() {
    const newMm = cardMm === CARD_LONG_MM ? CARD_SHORT_MM : CARD_LONG_MM;
    setCardMm(newMm);
    if (card1 && card2 && trunk1 && trunk2) {
      const cardDist = Math.sqrt((card2.x - card1.x) ** 2 + (card2.y - card1.y) ** 2);
      setBhdValue(calcBhd(cardDist / newMm, trunk1, trunk2));
    }
  }

  function reset() {
    setCard1(null); setCard2(null); setTrunk1(null); setTrunk2(null);
    setBhdValue(null); setCardMm(CARD_LONG_MM);
    if (cardResult?.found) { setMode('auto'); setAutoPhase('trunk-1'); }
    else { setMode('manual'); setManualPhase('card-1'); }
  }

  const isResult = (mode === 'auto' && autoPhase === 'result') || (mode === 'manual' && manualPhase === 'result');
  const isFirstStep = (mode === 'auto' && autoPhase === 'trunk-1') || (mode === 'manual' && manualPhase === 'card-1');

  // Progress indicator
  const totalSteps = mode === 'auto' ? 2 : 4;
  const currentStep = mode === 'auto'
    ? { 'trunk-1': 1, 'trunk-2': 2, 'result': 2 }[autoPhase]
    : { 'card-1': 1, 'card-2': 2, 'trunk-1': 3, 'trunk-2': 4, 'result': 4 }[manualPhase];

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-white text-sm font-semibold">BHD messen</h3>
          <p className="text-slate-500 text-xs">
            {mode === 'detecting' && 'Messkarte wird gesucht…'}
            {mode === 'auto' && 'Messkarte erkannt — nur Stammrand markieren'}
            {mode === 'manual' && 'Kartenränder + Stammrand markieren'}
          </p>
        </div>
        <button onClick={onSkip} className="text-slate-400 hover:text-white p-1"><X size={20} /></button>
      </div>

      {/* Progress */}
      {mode !== 'detecting' && (
        <div className="shrink-0 flex items-center justify-center gap-2 px-4 pb-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${
              i + 1 < currentStep! ? 'bg-emerald-500' : i + 1 === currentStep ? 'bg-white' : 'bg-slate-700'
            }`} />
          ))}
        </div>
      )}

      {/* Instruction */}
      <div className="shrink-0 px-4 py-2 text-center min-h-[48px]">
        {mode === 'detecting' && (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 size={14} className="animate-spin" /> Suche Messkarte…
          </div>
        )}
        {mode === 'auto' && autoPhase === 'trunk-1' && (
          <p className="text-sm text-red-400">Tippe auf den <span className="font-semibold">linken Stammrand</span></p>
        )}
        {mode === 'auto' && autoPhase === 'trunk-2' && (
          <p className="text-sm text-blue-400">Tippe auf den <span className="font-semibold">rechten Stammrand</span></p>
        )}
        {mode === 'manual' && manualPhase === 'card-1' && (
          <p className="text-sm text-yellow-400">Tippe auf ein Ende der <span className="font-semibold">langen Kartenseite</span></p>
        )}
        {mode === 'manual' && manualPhase === 'card-2' && (
          <p className="text-sm text-yellow-400">Tippe auf das <span className="font-semibold">andere Ende der langen Seite</span></p>
        )}
        {mode === 'manual' && manualPhase === 'trunk-1' && (
          <p className="text-sm text-red-400">Tippe auf den <span className="font-semibold">linken Stammrand</span></p>
        )}
        {mode === 'manual' && manualPhase === 'trunk-2' && (
          <p className="text-sm text-blue-400">Tippe auf den <span className="font-semibold">rechten Stammrand</span></p>
        )}
        {isResult && (
          <div className="text-emerald-400">
            <p className="text-2xl font-bold">{bhdValue} cm</p>
            <p className="text-xs text-emerald-500 mt-0.5">
              BHD gemessen {mode === 'auto' ? '(Messkarte)' : '(Kreditkarte)'}
            </p>
          </div>
        )}
      </div>

      {/* Image + Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={photoSrc} alt="Baum"
          className="absolute inset-0 w-full h-full object-contain" onLoad={draw} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }}
          onPointerUp={handleTap} />
      </div>

      {/* Actions */}
      <div className="shrink-0 px-4 py-3 space-y-2">
        {isResult && mode === 'manual' && (
          <button onClick={toggleCardSide}
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            Referenz: {cardMm === CARD_LONG_MM ? 'Breitseite (85,6 mm)' : 'Schmalseite (54 mm)'} — tippen zum Wechseln
          </button>
        )}
        <div className="flex gap-3">
          {!isResult && !isFirstStep && (
            <button onClick={reset}
              className="py-3 px-4 bg-slate-800 text-white rounded-xl text-sm font-medium flex items-center gap-2">
              <RotateCcw size={14} /> Neu
            </button>
          )}
          {!isResult && (
            <button onClick={onSkip}
              className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium">
              Ohne Messung weiter
            </button>
          )}
          {isResult && (
            <>
              <button onClick={reset}
                className="py-3 px-4 bg-slate-800 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                <RotateCcw size={14} />
              </button>
              <button onClick={() => bhdValue != null && onMeasured(bhdValue)}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                <Check size={14} /> {bhdValue} cm übernehmen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
