'use client';

import { useState } from 'react';
import { Crosshair, Ruler, User, CalendarDays, Loader2, ScanLine, Check, Trash2 } from 'lucide-react';
import { DetailPanelShell } from './DetailPanelShell';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateHunting, deleteHunting } from '@/actions/polygons';
import { toast } from 'sonner';
import { useMapStore } from '@/components/map/stores/useMapStores';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

const ACCENT = '#84cc16';

function formatArea(ha?: number | null): string {
  if (!ha) return '—';
  return ha >= 1 ? `${ha.toFixed(2)} ha` : `${(ha * 10000).toFixed(0)} m²`;
}

interface Props {
  hunting: any;
  forest: any;
  orgSlug: string;
  onClose: () => void;
  onRefresh: () => void;
  onDeleteSuccess: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export function HuntingDetailView({
  hunting, forest, orgSlug, onClose, onRefresh, onDeleteSuccess, canEdit, canDelete,
}: Props) {
  const setInteractionMode = useMapStore(s => s.setInteractionMode);
  const setEditingFeature  = useMapStore(s => s.setEditingFeature);
  const interactionMode    = useMapStore(s => s.interactionMode);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);

  const [name,    setName]    = useState(hunting.name ?? '');
  const [pachter, setPachter] = useState(hunting.pachter ?? '');
  const [endsAt,  setEndsAt]  = useState(hunting.endsAt ?? '');
  const [note,    setNote]    = useState(hunting.note ?? '');

  const isGeometryEditing = interactionMode === 'EDIT_GEOMETRY';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateHunting(hunting.id, { name, pachter, endsAt, note }, orgSlug);
      if (!res.success) throw new Error(res.error ?? 'Unbekannter Fehler');
      toast.success('Jagdfläche aktualisiert');
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
      setEditingFeature({ id: hunting.id, geoJson: hunting.geoJson, featureType: 'HUNTING', name, orgSlug });
      onClose();
      toast.info('Ziehpunkte verschieben um Fläche zu ändern');
    }
  };

  return (
    <DetailPanelShell
      isVisible={true}
      onClose={onClose}
      title={name || 'Jagdfläche'}
      icon={<Crosshair className="w-4 h-4" style={{ color: ACCENT }} />}
      headerColor=""
      headerStyle={{ background: `linear-gradient(to bottom right, ${ACCENT}40, rgba(0,0,0,0.8))` }}
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
          <div className="text-lg text-white font-mono font-medium">{formatArea(hunting.areaHa)}</div>
        </div>
        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] uppercase text-gray-500 font-bold mb-1 flex items-center gap-1.5">
            <Crosshair size={12} /> Typ
          </div>
          <div className="text-sm text-white">Jagdfläche</div>
        </div>
      </div>

      {/* WALD */}
      {forest && (
        <div className="text-xs text-gray-500">
          <span className="font-semibold text-gray-400">Wald:</span> {forest.name}
        </div>
      )}

      {/* PÄCHTER & LAUFZEIT */}
      {(pachter || endsAt || isEditing) && (
        <div className="space-y-3">
          {isEditing ? (
            <>
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1.5 flex items-center gap-1.5">
                  <User size={11} /> Pächter
                </label>
                <Input
                  value={pachter}
                  onChange={e => setPachter(e.target.value)}
                  className="bg-black/50 border-white/20 text-white"
                  placeholder="Name des Pächters"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1.5 flex items-center gap-1.5">
                  <CalendarDays size={11} /> Pacht bis
                </label>
                <Input
                  value={endsAt}
                  onChange={e => setEndsAt(e.target.value)}
                  className="bg-black/50 border-white/20 text-white"
                  placeholder="z. B. 31.03.2027"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              {pachter && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <User size={12} className="text-gray-600" />
                  <span className="text-gray-300">{pachter}</span>
                </div>
              )}
              {endsAt && (
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <CalendarDays size={12} className="text-gray-600" />
                  <span className="text-gray-300">Pacht bis: {endsAt}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* NOTIZ */}
      <div>
        <h4 className="text-[10px] uppercase text-gray-500 font-bold mb-2">Notiz</h4>
        {isEditing ? (
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="bg-black/50 border-white/20 text-white min-h-[80px]"
            placeholder="Notizen zur Jagdfläche..."
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
              title={`Jagdfläche "${name || 'Jagdfläche'}" löschen?`}
              description="Die Jagdfläche wird unwiderruflich von der Karte entfernt."
              confirmString={name || 'Jagdfläche'}
              onConfirm={async () => {
                const res = await deleteHunting(hunting.id, orgSlug);
                if (res.success) { onDeleteSuccess(); onClose(); }
                else throw new Error(res.error);
              }}
            />
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setName(hunting.name ?? ''); setPachter(hunting.pachter ?? ''); setEndsAt(hunting.endsAt ?? ''); setNote(hunting.note ?? ''); setIsEditing(false); }} className="text-gray-400">
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
            </Button>
          </div>
        </div>
      )}
    </DetailPanelShell>
  );
}
