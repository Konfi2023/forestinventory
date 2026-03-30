'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';

/**
 * BHD measurement via credit card reference — pure JS, no OpenCV.
 *
 * The user taps 4 points on the photo:
 *   1+2: Left & right edge of the credit card (→ scale: pixels per mm)
 *   3+4: Left & right edge of the tree trunk (→ BHD in mm)
 *
 * ISO 7810 credit card width: 85.6 mm
 */

const CARD_WIDTH_MM = 85.6;

type Phase = 'card-left' | 'card-right' | 'trunk-left' | 'trunk-right' | 'result';

const INSTRUCTIONS: Record<Phase, { text: string; color: string }> = {
  'card-left':   { text: 'Tippe auf den linken Rand der Karte', color: '#facc15' },
  'card-right':  { text: 'Tippe auf den rechten Rand der Karte', color: '#facc15' },
  'trunk-left':  { text: 'Tippe auf den linken Stammrand', color: '#ef4444' },
  'trunk-right': { text: 'Tippe auf den rechten Stammrand', color: '#3b82f6' },
  'result':      { text: '', color: '' },
};

interface Point { x: number; y: number }

interface Props {
  photoSrc: string;
  onMeasured: (bhdCm: number) => void;
  onSkip: () => void;
}

export function BhdMeasurement({ photoSrc, onMeasured, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>('card-left');
  const [cardLeft, setCardLeft] = useState<Point | null>(null);
  const [cardRight, setCardRight] = useState<Point | null>(null);
  const [trunkLeft, setTrunkLeft] = useState<Point | null>(null);
  const [trunkRight, setTrunkRight] = useState<Point | null>(null);
  const [bhdValue, setBhdValue] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute image display bounds (object-fit: contain)
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
    const dw = iw * scale;
    const dh = ih * scale;
    const ox = (cw - dw) / 2;
    const oy = (ch - dh) / 2;
    return { ox, oy, dw, dh, scale, iw, ih };
  }, []);

  // Draw overlay
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const bounds = getImageBounds();
    if (!canvas || !bounds) return;

    const { ox, oy, scale } = bounds;
    const container = containerRef.current!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, container.clientWidth, container.clientHeight);

    const toScreen = (p: Point) => ({ x: ox + p.x * scale, y: oy + p.y * scale });

    const drawPoint = (p: Point, color: string, label: string) => {
      const s = toScreen(p);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, s.x, s.y - 16);
    };

    const drawLine = (a: Point, b: Point, color: string, dashed = false) => {
      const sa = toScreen(a);
      const sb = toScreen(b);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dashed ? [6, 4] : []);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // Card points + line
    if (cardLeft) drawPoint(cardLeft, '#facc15', 'K1');
    if (cardRight) drawPoint(cardRight, '#facc15', 'K2');
    if (cardLeft && cardRight) drawLine(cardLeft, cardRight, '#facc15');

    // Trunk points + line
    if (trunkLeft) drawPoint(trunkLeft, '#ef4444', 'S1');
    if (trunkRight) drawPoint(trunkRight, '#3b82f6', 'S2');
    if (trunkLeft && trunkRight) drawLine(trunkLeft, trunkRight, '#22c55e', true);
  }, [cardLeft, cardRight, trunkLeft, trunkRight, getImageBounds]);

  useEffect(() => { draw(); }, [draw, phase]);

  // Also redraw on resize
  useEffect(() => {
    const handler = () => draw();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [draw]);

  function handleTap(e: React.MouseEvent | React.TouchEvent) {
    if (phase === 'result') return;
    const bounds = getImageBounds();
    if (!bounds) return;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = containerRef.current!.getBoundingClientRect();
    const { ox, oy, scale } = bounds;
    const imgX = (clientX - rect.left - ox) / scale;
    const imgY = (clientY - rect.top - oy) / scale;
    const point = { x: imgX, y: imgY };

    switch (phase) {
      case 'card-left':
        setCardLeft(point);
        setPhase('card-right');
        break;
      case 'card-right':
        setCardRight(point);
        setPhase('trunk-left');
        break;
      case 'trunk-left':
        setTrunkLeft(point);
        setPhase('trunk-right');
        break;
      case 'trunk-right': {
        setTrunkRight(point);
        // Calculate BHD
        const cardDist = Math.sqrt((cardRight!.x - cardLeft!.x) ** 2 + (cardRight!.y - cardLeft!.y) ** 2);
        const trunkDist = Math.sqrt((point.x - trunkLeft!.x) ** 2 + (point.y - trunkLeft!.y) ** 2);
        const pxPerMm = cardDist / CARD_WIDTH_MM;
        const bhdMm = trunkDist / pxPerMm;
        const bhd = Math.round(bhdMm / 10); // mm → cm, rounded
        setBhdValue(bhd);
        setPhase('result');
        break;
      }
    }
  }

  function reset() {
    setCardLeft(null);
    setCardRight(null);
    setTrunkLeft(null);
    setTrunkRight(null);
    setBhdValue(null);
    setPhase('card-left');
  }

  const instruction = INSTRUCTIONS[phase];
  const stepNumber = { 'card-left': 1, 'card-right': 2, 'trunk-left': 3, 'trunk-right': 4, 'result': 0 }[phase];

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-white text-sm font-semibold">BHD-Messung</h3>
          <p className="text-slate-500 text-xs">4 Punkte markieren: Karte + Stamm</p>
        </div>
        <button onClick={onSkip} className="text-slate-400 hover:text-white p-1">
          <X size={20} />
        </button>
      </div>

      {/* Progress dots */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-4 pb-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`w-2 h-2 rounded-full transition-colors ${
            i < stepNumber! ? 'bg-emerald-500' : i === stepNumber ? 'bg-white' : 'bg-slate-700'
          }`} />
        ))}
      </div>

      {/* Instruction */}
      <div className="shrink-0 px-4 py-2 text-center">
        {phase !== 'result' ? (
          <p className="text-sm" style={{ color: instruction.color }}>{instruction.text}</p>
        ) : (
          <div className="text-emerald-400">
            <p className="text-2xl font-bold">{bhdValue} cm</p>
            <p className="text-xs text-emerald-500 mt-0.5">BHD gemessen (Kreditkarte)</p>
          </div>
        )}
      </div>

      {/* Image + canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={photoSrc}
          alt="Baum"
          className="absolute inset-0 w-full h-full object-contain"
          onLoad={draw}
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
        {phase !== 'result' && phase !== 'card-left' && (
          <button onClick={reset}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            <RotateCcw size={14} /> Neu
          </button>
        )}
        {phase !== 'result' && (
          <button onClick={onSkip}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">
            Überspringen
          </button>
        )}
        {phase === 'result' && (
          <>
            <button onClick={reset}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
              <RotateCcw size={14} /> Neu
            </button>
            <button onClick={() => bhdValue != null && onMeasured(bhdValue)}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <Check size={14} /> {bhdValue} cm übernehmen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
