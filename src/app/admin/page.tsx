import { getSystemStats } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboard() {
  const stats = await getSystemStats();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">System Übersicht</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Registrierte Organisationen" value={stats.orgCount} />
        <StatsCard title="Gesamte Benutzer" value={stats.userCount} />
        <StatsCard title="Audit Logs (Gesamt)" value={stats.logsCount} />
      </div>
    </div>
  );
}

function StatsCard({ title, value }: { title: string, value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}