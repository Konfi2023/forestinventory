"use client";

import { useState, useEffect, Fragment } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { updateRolePermissions, deleteRole } from "@/actions/roles";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Typen definieren
type Role = {
  id: string;
  name: string;
  permissions: string[];
  isSystemRole: boolean;
};

interface Props {
  roles: Role[];
  orgSlug: string;
}

export function RoleMatrix({ roles, orgSlug }: Props) {
  const [localRoles, setLocalRoles] = useState(roles);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // WICHTIG: Wenn sich die Daten vom Server ändern (z.B. nach Löschen einer Rolle),
  // müssen wir den lokalen State synchronisieren.
  useEffect(() => {
    setLocalRoles(roles);
  }, [roles]);

  // Berechtigung umschalten
  const handleToggle = async (roleId: string, permissionKey: string, checked: boolean) => {
    // 1. Sofortiges lokales Update (damit es sich schnell anfühlt)
    const updatedRoles = localRoles.map((role) => {
      if (role.id !== roleId) return role;
      
      const newPermissions = checked
        ? [...role.permissions, permissionKey] // Hinzufügen
        : role.permissions.filter((p) => p !== permissionKey); // Entfernen
        
      return { ...role, permissions: newPermissions };
    });
    
    setLocalRoles(updatedRoles);

    // 2. Server Action im Hintergrund aufrufen
    try {
      const changedRole = updatedRoles.find(r => r.id === roleId);
      if(changedRole) {
        await updateRolePermissions(orgSlug, roleId, changedRole.permissions);
      }
    } catch (error) {
      console.error(error);
      toast.error("Fehler beim Speichern!");
      setLocalRoles(roles);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRole(orgSlug, deleteTarget);
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Löschen");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-700 w-1/3 min-w-[200px]">
                Funktion / Modul
              </th>
              {localRoles.map((role) => (
                <th key={role.id} className="px-6 py-4 font-medium text-slate-700 text-center min-w-[120px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-bold">{role.name}</span>
                    
                    {role.isSystemRole ? (
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        System
                      </span>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(role.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-slate-100"
                        title="Rolle löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => (
              /* Fragment behebt den "unique key" Fehler */
              <Fragment key={groupKey}>
                {/* Gruppen-Überschrift */}
                <tr className="bg-slate-50/50">
                  <td
                    colSpan={localRoles.length + 1}
                    className="px-6 py-2 font-semibold text-xs uppercase tracking-wider text-slate-500"
                  >
                    {group.label}
                  </td>
                </tr>

                {/* Einzelne Rechte */}
                {group.permissions.map((perm) => (
                  <tr key={perm.key} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="text-slate-700 font-medium">{perm.label}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {perm.key}
                      </div>
                    </td>
                    {localRoles.map((role) => {
                      // --- LOGIK UPDATE: Admin hat immer alles ---
                      const isAdminRole = role.name === "Administrator";
                      
                      // Wenn Admin, dann ist es immer "checked". Ansonsten prüfen wir das Array.
                      const hasPerm = isAdminRole ? true : role.permissions.includes(perm.key);
                      
                      // Wenn Admin, kann man es nicht ändern (disabled).
                      // Systemrollen generell sperren? Hier nur Admin spezifiziert.
                      const isDisabled = isAdminRole;

                      return (
                        <td key={`${role.id}-${perm.key}`} className="px-6 py-3 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={hasPerm}
                              disabled={isDisabled}
                              onCheckedChange={(checked) =>
                                handleToggle(role.id, perm.key, checked === true)
                              }
                              className={`
                                data-[state=checked]:bg-green-700 
                                data-[state=checked]:border-green-700
                                ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                              `}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <ConfirmDialog
      open={!!deleteTarget}
      onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
      title="Rolle löschen?"
      description="Diese Rolle wird dauerhaft gelöscht. Mitglieder mit dieser Rolle verlieren ihre Berechtigungen."
      confirmLabel="Löschen"
      destructive
      onConfirm={handleDelete}
    />
    </>
  );
}