'use client';

import type { BenchmarkResult, BenchmarkMetric } from '@/lib/benchmark';
import { BarChart3 } from 'lucide-react';

function MetricBar({ metric }: { metric: BenchmarkMetric }) {
  if (metric.value == null || metric.groupMin == null || metric.groupMax == null || metric.groupAvg == null) {
    return null;
  }

  const range = metric.groupMax - metric.groupMin;
  if (range <= 0) return null;

  // Position des eigenen Werts im Balken (0–100%)
  const valuePos = Math.max(0, Math.min(100, ((metric.value - metric.groupMin) / range) * 100));
  const avgPos = ((metric.groupAvg - metric.groupMin) / range) * 100;

  // Farbe basierend auf Perzentil
  const pct = metric.percentile ?? 50;
  const color = pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 60 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">{metric.label}</span>
        <span className={`font-bold ${textColor}`}>
          {metric.value.toFixed(metric.key === 'ndvi' ? 3 : 1)} {metric.unit}
          <span className="text-slate-400 font-normal ml-1">
            (P{metric.percentile})
          </span>
        </span>
      </div>
      <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
        {/* Durchschnitt-Marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-slate-400 z-10"
          style={{ left: `${avgPos}%` }}
          title={`Durchschnitt: ${metric.groupAvg.toFixed(metric.key === 'ndvi' ? 3 : 1)}`}
        />
        {/* Eigener Wert */}
        <div
          className={`absolute top-0 h-full w-2.5 rounded-full ${color} z-20 shadow-sm`}
          style={{ left: `${Math.max(0, valuePos - 1.25)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{metric.groupMin.toFixed(metric.key === 'ndvi' ? 3 : 1)}</span>
        <span>{metric.groupMax.toFixed(metric.key === 'ndvi' ? 3 : 1)}</span>
      </div>
    </div>
  );
}

export function BenchmarkCard({ benchmark }: { benchmark: BenchmarkResult }) {
  const validMetrics = benchmark.metrics.filter(m => m.value != null && m.groupAvg != null);

  if (validMetrics.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-violet-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Waldvergleich: {benchmark.forestName}</h3>
            <p className="text-xs text-slate-500">
              Vergleichsgruppe: {benchmark.groupDescription} (n={benchmark.groupSize})
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Noch keine Vergleichsdaten. Bitte Holzvorrat, Zuwachs oder Bestockungsgrad in den Abteilungen eintragen.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 size={18} className="text-violet-600" />
        <div>
          <h3 className="text-sm font-bold text-slate-900">Waldvergleich: {benchmark.forestName}</h3>
          <p className="text-xs text-slate-500">
            Vergleichsgruppe: {benchmark.groupDescription} (n={benchmark.groupSize})
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {validMetrics.map(m => (
          <MetricBar key={m.key} metric={m} />
        ))}
      </div>
    </div>
  );
}

export function BenchmarkEmpty() {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
      <BarChart3 size={20} className="text-slate-300 mx-auto mb-2" />
      <p className="text-sm text-slate-400">
        Keine Vergleichsdaten verfügbar. Abteilungen mit Baumart und Alter anlegen.
      </p>
    </div>
  );
}
