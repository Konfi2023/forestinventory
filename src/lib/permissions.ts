// src/lib/permissions.ts

export const PERMISSION_GROUPS = {
  USER_MANAGEMENT: {
    label: "Benutzerverwaltung",
    permissions: [
      { key: "users:view", label: "Benutzer sehen" },
      { key: "users:invite", label: "Benutzer einladen" },
      { key: "users:edit", label: "Benutzer bearbeiten" },
      { key: "users:delete", label: "Benutzer entfernen" },
    ]
  },
  ROLE_MANAGEMENT: {
    label: "Rollen & Rechte",
    permissions: [
      { key: "roles:view", label: "Rollen einsehen" },
      { key: "roles:manage", label: "Rollen verwalten" },
    ]
  },
  FOREST_INVENTORY: {
    label: "Forstinventur & Karten",
    permissions: [
      { key: "forest:view", label: "Karten & Bestände sehen" },
      { key: "forest:edit", label: "Geodaten bearbeiten" },
      { key: "forest:delete", label: "Wälder löschen" }, // Habe ich sicherheitshalber ergänzt
    ]
  },
  OPERATIONS: {
    label: "Arbeitsaufträge & Planung",
    permissions: [
      { key: "tasks:view", label: "Aufgaben einsehen" },
      { key: "tasks:create", label: "Aufgaben erstellen" },
      { key: "tasks:edit", label: "Aufgaben bearbeiten" },
      { key: "tasks:assign", label: "Aufgaben zuweisen" },
      { key: "tasks:delete", label: "Aufgaben löschen" },
      { key: "schedules:manage", label: "Wiederkehrende Pläne" },
      { key: "time:track", label: "Zeiten erfassen" },
      { key: "team:manage", label: "Team verwalten" }, // Fehlte im vorherigen Block, wird oft gebraucht
    ]
  }
} as const;

export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS)
  .flatMap(group => group.permissions.map(p => p.key));

export const ROLE_TEMPLATES = {
  ADMIN: {
    name: "Administrator",
    description: "Voller Zugriff auf die Organisation",
    permissions: ALL_PERMISSIONS 
  },
  FORESTER: {
    name: "Förster / Betriebsleiter",
    description: "Operative Planung und Steuerung",
    permissions: [
      "forest:view", "forest:edit", "users:view",
      "tasks:view", "tasks:create", "tasks:edit", "tasks:assign", "tasks:delete",
      "schedules:manage", "time:track"
    ]
  },
  VIEWER: {
    name: "Beobachter",
    description: "Nur Lesezugriff",
    permissions: ["forest:view", "tasks:view"]
  }
};

// --- WICHTIG: DIESER EXPORT FEHLTE ---
// Das Backend nutzt diese Konstanten für die Checks (z.B. PERMISSIONS.FOREST_VIEW)
export const PERMISSIONS = {
  // Forest
  FOREST_VIEW: 'forest:view',
  FOREST_EDIT: 'forest:edit',
  FOREST_DELETE: 'forest:delete',
  
  // Tasks
  TASK_VIEW: 'tasks:view',
  TASK_CREATE: 'tasks:create',
  TASK_EDIT: 'tasks:edit',
  
  // Team
  TEAM_MANAGE: 'team:manage',
  ROLES_MANAGE: 'roles:manage',
} as const;