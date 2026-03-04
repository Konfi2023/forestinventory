import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrgDashboardPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Willkommen zurück 👋</h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtfläche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 ha</div>
            <p className="text-xs text-muted-foreground">Aktuell erfasst</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Mitglieder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Aktive Nutzer</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}