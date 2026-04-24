'use client';

import { useState } from 'react';
import { PlusCircle, List, Map, Route } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { InventoryClient } from '@/app/dashboard/org/[slug]/(standard)/inventory/InventoryClient';
import { TreeListView } from './inventory/TreeListView';
import { MobileMapView } from './inventory/MobileMapView';
import { PathRecorder } from './inventory/PathRecorder';

type SubTab = 'capture' | 'list' | 'map' | 'paths';

interface Forest { id: string; name: string; }
interface Member { id: string; firstName: string | null; lastName: string | null; email: string; }

interface InventoryTabProps {
  forests: Forest[];
  orgSlug: string;
  members: Member[];
  onCapturingChange?: (capturing: boolean) => void;
}

export function InventoryTab({ forests, orgSlug, members, onCapturingChange }: InventoryTabProps) {
  const t = useTranslations('MobileApp');
  const [subTab, setSubTab] = useState<SubTab>('capture');

  return (
    <div className="flex flex-col h-full">
      {/* Sub-Tab-Leiste */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 flex">
        {([
          ['capture', t('subCapture'), PlusCircle],
          ['list',    t('subList'),    List],
          ['map',     t('subMap'),     Map],
          ['paths',   t('subPaths'),   Route],
        ] as [SubTab, string, any][]).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              subTab === key
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Inhalt */}
      <div className="flex-1 overflow-hidden">
        {subTab === 'capture' && (
          <div className="h-full overflow-y-auto">
            <InventoryClient forests={forests} orgSlug={orgSlug} members={members} onCapturingChange={onCapturingChange} />
          </div>
        )}
        {subTab === 'list' && <TreeListView orgSlug={orgSlug} forests={forests} members={members} />}
        {subTab === 'map'  && <MobileMapView orgSlug={orgSlug} forests={forests} />}
        {subTab === 'paths' && <PathRecorder orgSlug={orgSlug} forests={forests} onCapturingChange={onCapturingChange} />}
      </div>
    </div>
  );
}
