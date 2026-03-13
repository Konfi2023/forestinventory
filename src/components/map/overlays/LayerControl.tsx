'use client';

import { useMapStore } from '../stores/useMapStores';
import { LAYER_REGISTRY } from '../registry/LayerRegistry';
import { BASE_MAPS } from '../registry/MapConfig';
import { Layers, ChevronDown, ChevronUp, Check, Leaf, Play, Pause, Calendar, CloudRain, Zap, Wind, Grid3x3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

function formatRadarTime(unixTs: number): string {
  const now  = Date.now() / 1000;
  const diff = Math.round((unixTs - now) / 60);
  if (Math.abs(diff) <= 5)  return 'Jetzt';
  if (diff < 0) {
    const m = Math.abs(diff);
    return m < 60 ? `vor ${m} min` : `vor ${Math.round(m / 60)}h ${m % 60 ? (m % 60) + 'min' : ''}`.trim();
  }
  return `+${diff} min`;
}

function getTimeRange(dateStr: string): string {
  const end   = new Date(dateStr);
  const start = new Date(dateStr);
  start.setDate(end.getDate() - 30);
  return `${start.toISOString().split('T')[0]} – ${dateStr}`;
}

function getDateFromOffset(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().split('T')[0];
}

export function LayerControl() {
  const {
    activeBaseMap, setBaseMap,
    activeLayers, toggleLayer,
    satelliteLayer, setSatelliteLayer,
    satelliteDate,  setSatelliteDate,
    satelliteOpacity, setSatelliteOpacity,
    satellitePlaying, setSatellitePlaying,
    weatherRadar, setWeatherRadar,
    weatherRadarOpacity, setWeatherRadarOpacity,
    weatherRadarFrameIndex, setWeatherRadarFrameIndex,
    weatherRadarPlaying, setWeatherRadarPlaying,
    weatherRadarFrames,
    windyOpen, setWindyOpen,
    showCadastral, setShowCadastral,
  } = useMapStore();

  const [isOpen, setIsOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const biomasseActive = satelliteLayer === 'NDVI';

  // XOR-Handler — immer nur ein Overlay gleichzeitig aktiv
  const handleBiomasse = () => {
    if (biomasseActive) {
      setSatelliteLayer('NONE');
      setSatellitePlaying(false);
    } else {
      setSatelliteLayer('NDVI');
      setWeatherRadar(false);
      setWindyOpen(false);
      setShowCadastral(false);
    }
  };

  const handleWeatherRadar = () => {
    if (weatherRadar) {
      setWeatherRadar(false);
    } else {
      setWeatherRadar(true);
      setSatelliteLayer('NONE');
      setSatellitePlaying(false);
      setWindyOpen(false);
      setShowCadastral(false);
    }
  };

  const handleWindy = () => {
    if (windyOpen) {
      setWindyOpen(false);
    } else {
      setWindyOpen(true);
      setSatelliteLayer('NONE');
      setSatellitePlaying(false);
      setWeatherRadar(false);
      setShowCadastral(false);
    }
  };

  const handleFlurkarte = () => {
    if (showCadastral) {
      setShowCadastral(false);
    } else {
      setShowCadastral(true);
      setSatelliteLayer('NONE');
      setSatellitePlaying(false);
      setWeatherRadar(false);
      setWindyOpen(false);
    }
  };

  // Timer für Biomasse-Zeitraffer
  useEffect(() => {
    if (!satellitePlaying) return;
    const interval = setInterval(() => {
      setMonthOffset(prev => (prev >= 0 ? -24 : prev + 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [satellitePlaying]);

  // monthOffset → satelliteDate
  useEffect(() => {
    setSatelliteDate(getDateFromOffset(monthOffset));
  }, [monthOffset, setSatelliteDate]);

  // Timer für Radar-Zeitraffer
  useEffect(() => {
    if (!weatherRadarPlaying || !weatherRadarFrames.length) return;
    const interval = setInterval(() => {
      setWeatherRadarFrameIndex((weatherRadarFrameIndex + 1) % weatherRadarFrames.length);
    }, 600);
    return () => clearInterval(interval);
  }, [weatherRadarPlaying, weatherRadarFrames.length, weatherRadarFrameIndex, setWeatherRadarFrameIndex]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setMonthOffset(val);
    setSatelliteDate(getDateFromOffset(val));
  };

  const displayDate = new Date();
  displayDate.setMonth(displayDate.getMonth() + monthOffset);
  const monthLabel = displayDate.toLocaleString('de-DE', { month: 'short', year: '2-digit' });

  const overlayLayers = Object.values(LAYER_REGISTRY).filter(l => !l.isBaseLayer);

  return (
    <div className="bg-[#151515]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all w-72 flex flex-col font-sans">

      {/* HEADER */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between text-xs font-bold text-white hover:bg-white/5 transition border-b border-white/5"
      >
        <span className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#10b981]" />
          Kartensteuerung
        </span>
        <span className="text-gray-500">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">

          {/* 1. HINTERGRUNDKARTE */}
          <section>
            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-wider">
              Hintergrund
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(BASE_MAPS).map((map) => (
                <button
                  key={map.id}
                  onClick={() => setBaseMap(map.id as any)}
                  className={cn(
                    "relative h-16 rounded-lg border transition-all overflow-hidden group",
                    activeBaseMap === map.id
                      ? "border-[#10b981] ring-1 ring-[#10b981]"
                      : "border-white/10 hover:border-white/30"
                  )}
                >
                  <div
                    className="absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity"
                    style={{ backgroundColor: map.previewColor }}
                  />
                  <span className="absolute bottom-1 left-2 text-[10px] font-medium text-white z-10 shadow-black drop-shadow-md">
                    {map.label}
                  </span>
                  {activeBaseMap === map.id && (
                    <div className="absolute top-1 right-1 bg-[#10b981] text-black rounded-full p-0.5">
                      <Check size={8} strokeWidth={4} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          <div className="h-px bg-white/10 w-full" />

          {/* 2. BIOMASSE */}
          <section>
            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-wider flex items-center gap-1.5">
              <Leaf className="w-3 h-3" /> Vegetationsindex
            </h4>

            <button
              onClick={handleBiomasse}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-lg text-xs transition-all border mb-2',
                biomasseActive
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-transparent border-white/10 text-gray-500 hover:bg-white/5 hover:text-gray-300',
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded flex items-center justify-center transition-colors',
                biomasseActive ? 'bg-emerald-500' : 'bg-[#222]',
              )}>
                <Leaf size={14} className={biomasseActive ? 'text-white' : 'text-gray-600'} />
              </div>
              <span className="flex-1 text-left font-medium">Biomasse (NDVI)</span>
              <div className={cn('w-8 h-4 rounded-full relative transition-colors', biomasseActive ? 'bg-emerald-500' : 'bg-gray-700')}>
                <div className={cn('absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm', biomasseActive ? 'left-4.5' : 'left-0.5')} />
              </div>
            </button>

            {/* Zeitsteuerung — nur wenn aktiv */}
            {biomasseActive && (
              <div className="space-y-3 bg-black/30 p-3 rounded-lg border border-white/5">

                {/* Datum + Play */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-white">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    {monthLabel}
                  </div>
                  <button
                    onClick={() => setSatellitePlaying(!satellitePlaying)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                    title={satellitePlaying ? 'Pause' : 'Zeitraffer abspielen'}
                  >
                    {satellitePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                </div>

                {/* Zeit-Slider (24 Monate zurück) */}
                <input
                  type="range"
                  min="-24"
                  max="0"
                  value={monthOffset}
                  onChange={handleSlider}
                  className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  style={{ background: `linear-gradient(to right, #10b981 ${((monthOffset + 24) / 24) * 100}%, rgba(255,255,255,0.15) 0%)` }}
                />
                <div className="flex justify-between text-[9px] text-gray-600">
                  <span>vor 2 Jahren</span><span>Heute</span>
                </div>

                {/* Deckkraft */}
                <div>
                  <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                    <span>Deckkraft</span>
                    <span>{Math.round(satelliteOpacity * 100)} %</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={satelliteOpacity}
                    onChange={e => setSatelliteOpacity(Number(e.target.value))}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* NDVI-Legende */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                    <span className="flex items-center gap-1"><Leaf className="w-2.5 h-2.5 text-red-400" /> Geringe Biomasse</span>
                    <span className="flex items-center gap-1">Hohe Dichte <Leaf className="w-2.5 h-2.5 text-emerald-400" /></span>
                  </div>
                  <div className="h-2 w-full rounded-full" style={{ background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e)' }} />
                  <p className="text-[9px] text-gray-600 mt-1">Sentinel-2 L2A · {getTimeRange(satelliteDate)}</p>
                </div>
              </div>
            )}
          </section>

          <div className="h-px bg-white/10 w-full" />

          {/* 3. WETTERKARTE */}
          <section>
            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-wider flex items-center gap-1.5">
              <CloudRain className="w-3 h-3" /> Wetterkarte
            </h4>

            <button
              onClick={handleWeatherRadar}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-lg text-xs transition-all border mb-2',
                weatherRadar
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                  : 'bg-transparent border-white/10 text-gray-500 hover:bg-white/5 hover:text-gray-300',
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded flex items-center justify-center transition-colors',
                weatherRadar ? 'bg-sky-500' : 'bg-[#222]',
              )}>
                <CloudRain size={14} className={weatherRadar ? 'text-white' : 'text-gray-600'} />
              </div>
              <span className="flex-1 text-left font-medium">Niederschlagsradar</span>
              <div className={cn('w-8 h-4 rounded-full relative transition-colors', weatherRadar ? 'bg-sky-500' : 'bg-gray-700')}>
                <div className={cn('absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm', weatherRadar ? 'left-4.5' : 'left-0.5')} />
              </div>
            </button>

            {weatherRadar && weatherRadarFrames.length > 0 && (
              <div className="space-y-3 bg-black/30 p-3 rounded-lg border border-white/5">

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-white">
                    {weatherRadarFrames[weatherRadarFrameIndex]?.isPast === false
                      ? <Zap className="w-3 h-3 text-sky-400" />
                      : <CloudRain className="w-3 h-3 text-sky-400" />
                    }
                    {formatRadarTime(weatherRadarFrames[weatherRadarFrameIndex]?.time ?? 0)}
                    {weatherRadarFrames[weatherRadarFrameIndex]?.isPast === false && (
                      <span className="text-[9px] bg-sky-500/30 text-sky-300 px-1.5 py-0.5 rounded-full ml-1">Prognose</span>
                    )}
                  </div>
                  <button
                    onClick={() => setWeatherRadarPlaying(!weatherRadarPlaying)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                    title={weatherRadarPlaying ? 'Pause' : 'Zeitraffer abspielen'}
                  >
                    {weatherRadarPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                </div>

                <input
                  type="range"
                  min={0}
                  max={weatherRadarFrames.length - 1}
                  value={weatherRadarFrameIndex}
                  onChange={e => { setWeatherRadarPlaying(false); setWeatherRadarFrameIndex(Number(e.target.value)); }}
                  className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  style={{
                    background: `linear-gradient(to right, #0ea5e9 ${(weatherRadarFrameIndex / Math.max(1, weatherRadarFrames.length - 1)) * 100}%, rgba(255,255,255,0.15) 0%)`,
                  }}
                />
                <div className="flex justify-between text-[9px] text-gray-600">
                  <span>{formatRadarTime(weatherRadarFrames[0]?.time ?? 0)}</span>
                  <span>{formatRadarTime(weatherRadarFrames[weatherRadarFrames.length - 1]?.time ?? 0)}</span>
                </div>

                <div>
                  <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                    <span>Deckkraft</span>
                    <span>{Math.round(weatherRadarOpacity * 100)} %</span>
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={weatherRadarOpacity}
                    onChange={e => setWeatherRadarOpacity(Number(e.target.value))}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                <div className="pt-2 border-t border-white/10">
                  <div className="h-2 flex-1 rounded-full mb-1" style={{ background: 'linear-gradient(to right, #a5f3fc, #38bdf8, #0284c7, #1d4ed8, #4c1d95)' }} />
                  <div className="flex justify-between text-[9px] text-gray-600">
                    <span>Leichter Regen</span><span>Starkregen</span>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-1">RainViewer · Aktualisierung alle 5 min</p>
                </div>
              </div>
            )}

            {weatherRadar && weatherRadarFrames.length === 0 && (
              <p className="text-[10px] text-gray-500 text-center py-2 animate-pulse">Lade Radar-Daten…</p>
            )}
          </section>

          <div className="h-px bg-white/10 w-full" />

          {/* 4. WINDY */}
          <section>
            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-wider flex items-center gap-1.5">
              <Wind className="w-3 h-3" /> Windy Wetterkarte
            </h4>
            <button
              onClick={handleWindy}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-lg text-xs transition-all border',
                windyOpen
                  ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                  : 'bg-transparent border-white/10 text-gray-500 hover:bg-white/5 hover:text-gray-300',
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded flex items-center justify-center transition-colors',
                windyOpen ? 'bg-teal-500' : 'bg-[#222]',
              )}>
                <Wind size={14} className={windyOpen ? 'text-white' : 'text-gray-600'} />
              </div>
              <span className="flex-1 text-left font-medium">Wind · Wolken · Regen</span>
              <div className={cn('w-8 h-4 rounded-full relative transition-colors', windyOpen ? 'bg-teal-500' : 'bg-gray-700')}>
                <div className={cn('absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm', windyOpen ? 'left-4.5' : 'left-0.5')} />
              </div>
            </button>
            {windyOpen && (
              <p className="text-[10px] text-gray-500 mt-2 text-center">
                Windy läuft — zum Schließen oben rechts klicken
              </p>
            )}
          </section>

          <div className="h-px bg-white/10 w-full" />

          {/* 5. FLURKARTE */}
          <section>
            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-wider flex items-center gap-1.5">
              <Grid3x3 className="w-3 h-3" /> Flurkarte
            </h4>
            <button
              onClick={handleFlurkarte}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-lg text-xs transition-all border',
                showCadastral
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-transparent border-white/10 text-gray-500 hover:bg-white/5 hover:text-gray-300',
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded flex items-center justify-center transition-colors',
                showCadastral ? 'bg-amber-500' : 'bg-[#222]',
              )}>
                <Grid3x3 size={14} className={showCadastral ? 'text-white' : 'text-gray-600'} />
              </div>
              <span className="flex-1 text-left font-medium">Flurstücke (ALKIS)</span>
              <div className={cn('w-8 h-4 rounded-full relative transition-colors', showCadastral ? 'bg-amber-500' : 'bg-gray-700')}>
                <div className={cn('absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm', showCadastral ? 'left-4.5' : 'left-0.5')} />
              </div>
            </button>
            {showCadastral && (
              <p className="text-[10px] text-gray-500 mt-2 px-1">
                Automatische Dienst-Auswahl je Bundesland · WMS-Dienst erst ab Zoom 12–17 sichtbar
              </p>
            )}
          </section>

          <div className="h-px bg-white/10 w-full" />

          {/* 6. EBENEN & OBJEKTE */}
          <section>
            <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-3 tracking-wider">
              Ebenen & Objekte
            </h4>
            <div className="space-y-1">
              {overlayLayers.map((layer) => {
                const isActive = activeLayers.includes(layer.id);
                const Icon = layer.icon;

                return (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-lg text-xs transition-all border group",
                      isActive
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center transition-colors",
                        isActive ? "" : "grayscale opacity-50"
                      )}
                      style={{ backgroundColor: isActive ? layer.color : '#222' }}
                    >
                      <Icon size={14} className="text-black/80" />
                    </div>
                    <span className="flex-1 text-left font-medium">{layer.label}</span>
                    <div className={cn(
                      "w-8 h-4 rounded-full relative transition-colors",
                      isActive ? "bg-[#10b981]" : "bg-gray-700"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                        isActive ? "left-4.5" : "left-0.5"
                      )} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
