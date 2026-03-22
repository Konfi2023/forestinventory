'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react';

const MONTHS = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
];
const DAY_NAMES = ['Mo','Di','Mi','Do','Fr','Sa','So'];

interface DatePickerSheetProps {
  /** ISO-Datum YYYY-MM-DD oder '' */
  value: string;
  label?: string;
  onChange: (v: string) => void;
  onClose: () => void;
}

export function DatePickerSheet({ value, label = 'Datum wählen', onChange, onClose }: DatePickerSheetProps) {
  const todayObj = new Date();
  const parsed   = value ? new Date(value + 'T12:00:00') : todayObj;

  const [viewYear,  setViewYear]  = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth()); // 0–11

  // Kalender-Zellen aufbauen
  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=So
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;     // Mo=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selDate = value ? new Date(value + 'T12:00:00') : null;
  function isSelected(day: number) {
    return !!selDate
      && selDate.getFullYear() === viewYear
      && selDate.getMonth()    === viewMonth
      && selDate.getDate()     === day;
  }
  function isToday(day: number) {
    return todayObj.getFullYear() === viewYear
      && todayObj.getMonth()    === viewMonth
      && todayObj.getDate()     === day;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0);  setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function pick(day: number) {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    onClose();
  }

  function pickToday() {
    const t = new Date();
    onChange(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`);
    onClose();
  }

  function pickOffset(days: number) {
    const t = new Date();
    t.setDate(t.getDate() + days);
    onChange(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl w-full">

        {/* Griffleiste */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Kopfzeile */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <span className="text-base font-bold text-slate-900">{label}</span>
          <button onClick={onClose} className="p-2.5 text-slate-400 active:text-slate-800 rounded-xl active:bg-slate-100">
            <X size={22} />
          </button>
        </div>

        {/* Schnellauswahl */}
        <div className="flex gap-2 px-5 mb-4">
          {([['Heute', 0], ['+ 3 Tage', 3], ['+ 1 Woche', 7], ['+ 2 Wochen', 14]] as [string, number][]).map(([lbl, d]) => (
            <button
              key={d}
              onClick={() => pickOffset(d)}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 active:bg-emerald-600 active:text-white transition-colors"
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Monats-Navigation */}
        <div className="flex items-center justify-between px-4 mb-3">
          <button
            onClick={prevMonth}
            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-100 active:bg-slate-200 text-slate-700"
          >
            <ChevronLeft size={26} />
          </button>
          <span className="text-lg font-bold text-slate-900">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-100 active:bg-slate-200 text-slate-700"
          >
            <ChevronRight size={26} />
          </button>
        </div>

        {/* Wochentag-Kopf */}
        <div className="grid grid-cols-7 px-4 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-bold text-slate-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Tage-Grid */}
        <div className="grid grid-cols-7 px-4 gap-y-1 pb-2">
          {cells.map((day, i) => (
            <div key={i} className="flex items-center justify-center p-0.5">
              {day ? (
                <button
                  onClick={() => pick(day)}
                  className={`w-full py-3 rounded-xl text-base font-bold transition-colors leading-none ${
                    isSelected(day)
                      ? 'bg-emerald-500 text-white'
                      : isToday(day)
                      ? 'bg-slate-100 text-emerald-600 ring-2 ring-emerald-500'
                      : 'text-slate-800 active:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              ) : (
                <div className="w-full py-3" />
              )}
            </div>
          ))}
        </div>

        {/* Kein Datum */}
        <div className="px-4 pt-2 pb-10">
          <button
            onClick={() => { onChange(''); onClose(); }}
            className="w-full py-4 rounded-2xl bg-slate-100 text-slate-500 text-sm font-semibold active:bg-slate-200"
          >
            Kein Datum
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trigger-Button – ersetzt <input type="date"> überall
// ---------------------------------------------------------------------------
interface DateTriggerProps {
  value: string;
  placeholder?: string;
  onClick: () => void;
}

export function DateTrigger({ value, placeholder = 'Kein Datum gewählt', onClick }: DateTriggerProps) {
  const label = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('de-DE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-4 bg-white border border-slate-300 rounded-xl active:bg-slate-50 transition-colors text-left"
    >
      <CalendarDays size={24} className="text-emerald-500 shrink-0" />
      <span className={`text-base ${label ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
        {label ?? placeholder}
      </span>
    </button>
  );
}
