'use client';

import { useState } from 'react';
import { Grid3x3, Ruler, Loader2, ScanLine, Check, Trash2 } from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updateCompartment, deleteCompartment } from '@/actions/polygons';
import { toast } from 'sonner';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

function formatArea(ha?: number | null): string {
  if (!ha) return '—';
  return ha >= 1 ? `${ha.toFixed(2)} ha` : `${(ha * 10000).toFixed(0)} m²`;
}

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#ef4444',
  '#a855f7', '#eab308', '#ec4899', '#64748b',
];

interface Props {
  compartment: any;
  forest: any;
  orgSlug: string;
  onClose: () => void;
  onRefresh: () => void;
  onDeleteSuccess: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function CompartmentDetailView({
  compartment, forest, orgSlug, onClose, onRefresh, onDeleteSuccess, canEdit, canDelete,
}: Props) {
  const setInteractionMode = useMapStore(s => s.setInteractionMode);
  const setEditingFeature  = useMapStore(s => s.setEditingFeature);
  const interactionMode    = useMapStore(s => s.interactionMode);

  const [isEditing,  setIsEditing]  = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);
  const [name,       setName]       = useState(compartment.name ?? '');
  const [note,       setNote]       = useState(compartment.note ?? '');
  const [color,      setColor]      = useState(compartment.color ?? '#3b82f6');

  const isGeometryEditing = interactionMode === 'EDIT_GEOMETRY';
  const displayName = name.trim() || 'Abteilung';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateCompartment(compartment.id, { name, note, color }, orgSlug);
      if (!res.success) throw new Error(res.error ?? 'Unbekannter Fehler');
      toast.success('Abteilung aktualisiert');
      setIsEditing(false);
      onRefresh();
    } catch (e: any) {
      toast.error(`Fehler: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleGeometry = () => {
    if (isGeometryEditing) {
      setInteractionMode('VIEW');
      setEditingFeature(null);
    } else {
      setInteractionMode('EDIT_GEOMETRY');
      setEditingFeature({ id: compartment.id, geoJson: compartment.geoJson, featureType: 'COMPARTMENT', name: displayName, orgSlug });
      onClose();
      toast.info('Ziehpunkte verschieben um Fläche zu ändern');
    }
  };

  const resetEditing = () => {
    setName(compartment.name ?? '');
    setNote(compartment.note ?? '');
    setColor(compartment.color ?? '#3b82f6');
    setIsEditing(false);
  };

  return (
    <DetailPanelShell
      isVisible={true}
      onClose={onClose}
      title={displayName}
      icon={<Grid3x3 className="w-4 h-4" style={{ color }} />}
      headerColor=""
      headerStyle={{ background: `linear-gradient(to bottom right, ${color}40, rgba(0,0,0,0.8))` }}
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
      editNameValue={name}
      onEditNameChange={setName}
      canEdit={canEdit}
      canDelete={canDelete}
      onDelete={() => {}}
    >
      {/* FAKTEN */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1.5">
            <Ruler size={12} /> Fläche
          </div>
          <div className="text-lg text-white font-mono font-medium">{formatArea(compartment.areaHa)}</div>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Wald</div>
          <div className="text-sm text-gray-300 truncate">{forest?.name ?? '—'}</div>
        </div>
      </div>

      {/* FARBE */}
      <div>
        <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Farbe</h4>
        {isEditing ? (
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? 'white' : 'transparent',
                  transform: color === c ? 'scale(1.15)' : undefined,
                }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-7 h-7 rounded-full cursor-pointer border border-white/20 bg-transparent"
              title="Benutzerdefinierte Farbe"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-400">{color}</span>
          </div>
        )}
      </div>

      {/* NOTIZ */}
      <div>
        <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Notiz</h4>
        {isEditing ? (
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="bg-black/50 border-white/20 text-white min-h-[80px]"
            placeholder="Notizen zur Abteilung…"
          />
        ) : (
          <p className="text-sm text-gray-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5 min-h-[48px] whitespace-pre-wrap">
            {note || 'Keine Notiz.'}
          </p>
        )}
      </div>

      {/* GEOMETRIE */}
      {isEditing && (
        <div className="pt-2 border-t border-white/10 mt-2">
          <label className="text-[10px] uppercase text-gray-500 font-bold mb-2 block">Geometrie</label>
          <Button
            variant="outline"
            className={`w-full border-white/10 text-gray-300 hover:text-white hover:bg-white/10 h-10 font-bold ${isGeometryEditing ? 'bg-blue-900/20 border-blue-500 text-blue-400' : ''}`}
            onClick={handleToggleGeometry}
          >
            {isGeometryEditing
              ? <><Check className="w-4 h-4 mr-2" /> Bearbeiten beenden</>
              : <><ScanLine className="w-4 h-4 mr-2" /> Fläche auf Karte ändern</>}
          </Button>
        </div>
      )}

      {/* FOOTER */}
      {isEditing && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
          {canDelete ? (
            <DeleteConfirmDialog
              trigger={
                <Button variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-950/30 px-3">
                  <Trash2 className="w-4 h-4 mr-2" /> Löschen
                </Button>
              }
              title="Abteilung löschen?"
              description="Die Abteilung wird unwiderruflich von der Karte entfernt. Verknüpfte Bäume behalten ihre Position."
              confirmString={displayName}
              onConfirm={async () => {
                const res = await deleteCompartment(compartment.id, orgSlug);
                if (res.success) { onDeleteSuccess(); onClose(); }
                else throw new Error(res.error);
              }}
            />
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={resetEditing} className="text-gray-400">
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isSaving} style={{ backgroundColor: color }} className="text-white hover:opacity-90">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
            </Button>
          </div>
        </div>
      )}
    </DetailPanelShell>
  );
}
