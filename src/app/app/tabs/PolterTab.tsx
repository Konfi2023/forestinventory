'use client';

import { useState } from 'react';
import { PlusCircle, List, Map } from 'lucide-react';
import { PolterCaptureClient } from './PolterCaptureClient';
import { PolterListView } from './inventory/PolterListView';
import { MobileMapView } from './inventory/MobileMapView';

type SubTab = 'capture' | 'list' | 'map';

interface Forest { id: string; name: string; }

interface Props {
  forests: Forest[];
  orgSlug: string;
}

export function PolterTab({ forests, orgSlug }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('capture');

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 bg-white border-b border-slate-200 flex">
        {([
          ['capture', 'Erfassen', PlusCircle],
          ['list',    'Liste',    List],
          ['map',     'Karte',    Map],
        ] as [SubTab, string, any][]).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              subTab === key
                ? 'text-amber-600 border-b-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {subTab === 'capture' && (
          <div className="h-full overflow-y-auto">
            <PolterCaptureClient forests={forests} orgSlug={orgSlug} />
          </div>
        )}
        {subTab === 'list' && <PolterListView orgSlug={orgSlug} forests={forests} />}
        {subTab === 'map'  && <MobileMapView  orgSlug={orgSlug} forests={forests} />}
      </div>
    </div>
  );
}
