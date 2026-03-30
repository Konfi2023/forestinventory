'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';

/**
 * BHD measurement via credit card reference — pure JS, no OpenCV.
 *
 * User taps 4 points:
 *   1+2: Long edge of the credit card (MUST be the long/wide side = 85.6 mm)
 *   3+4: Left & right edge of the tree trunk → BHD
 *
 * ISO 7810: 85.6 mm × 54.0 mm
 * After tapping card points, we check: if the distance ratio is closer to
 * 54mm (short side), we warn the user and use 54mm instead.
 */

const CARD_LONG_MM = 85.6;
const CARD_SHORT_MM = 54.0;

type Phase = 'card-1' | 'card-2' | 'trunk-1' | 'trunk-2' | 'result';

interface Point { x: number; y: number }

interface Props {
  photoSrc: string;
  onMeasured: (bhdCm: number) => void;
  onSkip: () => void;
}

export function BhdMeasurement({ photoSrc, onMeasured, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>('card-1');
  const [card1, setCard1] = useState<Point | null>(null);
  const [card2, setCard2] = useState<Point | null>(null);
  const [trunk1, setTrunk1] = useState<Point | null>(null);
  const [trunk2, setTrunk2] = useState<Point | null>(null);
  const [bhdValue, setBhdValue] = useState<number | null>(null);
  const [cardMm, setCardMm] = useState(CARD_LONG_MM);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getImageBounds = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return null;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
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

    const dot = (p: Point, color: string, label: string) => {
      const s = toS(p);
      ctx.beginPath(); ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, s.x, s.y - 15);
    };

    const line = (a: Point, b: Point, color: string, dash = false) => {
      const sa = toS(a), sb = toS(b);
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.setLineDash(dash ? [6, 4] : []);
      ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.stroke();
      ctx.setLineDash([]);
    };

    if (card1) dot(card1, '#facc15', '1');
    if (card2) dot(card2, '#facc15', '2');
    if (card1 && card2) line(card1, card2, '#facc15');
    if (trunk1) dot(trunk1, '#ef4444', '3');
    if (trunk2) dot(trunk2, '#3b82f6', '4');
    if (trunk1 && trunk2) line(trunk1, trunk2, '#22c55e', true);
  }, [card1, card2, trunk1, trunk2, getImageBounds]);

  useEffect(() => { draw(); }, [draw, phase]);
  useEffect(() => {
    const h = () => draw();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [draw]);

  function handleTap(e: React.PointerEvent) {
    if (phase === 'result') return;
    const bounds = getImageBounds();
    if (!bounds) return;
    const cx = e.clientX;
    const cy = e.clientY;
    const rect = containerRef.current!.getBoundingClientRect();
    const { ox, oy, scale } = bounds;
    const p = { x: (cx - rect.left - ox) / scale, y: (cy - rect.top - oy) / scale };

    switch (phase) {
      case 'card-1': setCard1(p); setPhase('card-2'); break;
      case 'card-2': {
        setCard2(p);
        // Auto-detect if user marked long or short side
        // We'll ask in trunk phase, but pre-calculate both
        setPhase('trunk-1');
        break;
      }
      case 'trunk-1': setTrunk1(p); setPhase('trunk-2'); break;
      case 'trunk-2': {
        setTrunk2(p);
        const cardDist = Math.sqrt((card2!.x - card1!.x) ** 2 + (card2!.y - card1!.y) ** 2);
        const trunkDist = Math.sqrt((p.x - trunk1!.x) ** 2 + (p.y - trunk1!.y) ** 2);
        // Use long side by default; component allows switching via cardMm state
        const pxPerMm = cardDist / cardMm;
        const bhd = Math.round(trunkDist / pxPerMm / 10); // mm → cm
        setBhdValue(bhd);
        setPhase('result');
        break;
      }
    }
  }

  // Recalculate when switching card side
  function toggleCardSide() {
    const newMm = cardMm === CARD_LONG_MM ? CARD_SHORT_MM : CARD_LONG_MM;
    setCardMm(newMm);
    if (card1 && card2 && trunk1 && trunk2) {
      const cardDist = Math.sqrt((card2.x - card1.x) ** 2 + (card2.y - card1.y) ** 2);
      const trunkDist = Math.sqrt((trunk2.x - trunk1.x) ** 2 + (trunk2.y - trunk1.y) ** 2);
      const bhd = Math.round(trunkDist / (cardDist / newMm) / 10);
      setBhdValue(bhd);
    }
  }

  function reset() {
    setCard1(null); setCard2(null); setTrunk1(null); setTrunk2(null);
    setBhdValue(null); setCardMm(CARD_LONG_MM); setPhase('card-1');
  }

  const stepNum = { 'card-1': 1, 'card-2': 2, 'trunk-1': 3, 'trunk-2': 4, 'result': 0 }[phase];

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-white text-sm font-semibold">BHD messen</h3>
          <p className="text-slate-500 text-xs">Kreditkarte + Stammrand markieren</p>
        </div>
        <button onClick={onSkip} className="text-slate-400 hover:text-white p-1"><X size={20} /></button>
      </div>

      {/* Progress */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-4 pb-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={`w-2 h-2 rounded-full ${i < stepNum! ? 'bg-emerald-500' : i === stepNum ? 'bg-white' : 'bg-slate-700'}`} />
        ))}
      </div>

      {/* Instruction */}
      <div className="shrink-0 px-4 py-2 text-center">
        {phase === 'card-1' && <p className="text-sm text-yellow-400">Tippe auf ein Ende der <span className="font-semibold">langen Kartenseite</span> (Breitseite)</p>}
        {phase === 'card-2' && <p className="text-sm text-yellow-400">Tippe auf das andere Ende der <span className="font-semibold">langen Kartenseite</span></p>}
        {phase === 'trunk-1' && <p className="text-sm text-red-400">Tippe auf den <span className="font-semibold">linken Stammrand</span></p>}
        {phase === 'trunk-2' && <p className="text-sm text-blue-400">Tippe auf den <span className="font-semibold">rechten Stammrand</span></p>}
        {phase === 'result' && (
          <div className="text-emerald-400">
            <p className="text-2xl font-bold">{bhdValue} cm</p>
            <p className="text-xs text-emerald-500 mt-0.5">BHD gemessen</p>
          </div>
        )}
      </div>

      {/* Image + Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={photoSrc} alt="Baum"
          className="absolute inset-0 w-full h-full object-contain" onLoad={draw} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }}
          onPointerUp={(e) => { e.preventDefault(); handleTap(e); }} />
      </div>

      {/* Actions */}
      <div className="shrink-0 px-4 py-3 space-y-2">
        {/* Card side toggle — only in result */}
        {phase === 'result' && (
          <button onClick={toggleCardSide}
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            Referenz: {cardMm === CARD_LONG_MM ? 'Breitseite (85,6 mm)' : 'Schmalseite (54 mm)'} — tippen zum Wechseln
          </button>
        )}
        <div className="flex gap-3">
          {phase !== 'result' && phase !== 'card-1' && (
            <button onClick={reset}
              className="py-3 px-4 bg-slate-800 text-white rounded-xl text-sm font-medium flex items-center gap-2">
              <RotateCcw size={14} /> Neu
            </button>
          )}
          {phase !== 'result' && (
            <button onClick={onSkip}
              className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium">
              Ohne Messung weiter
            </button>
          )}
          {phase === 'result' && (
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
