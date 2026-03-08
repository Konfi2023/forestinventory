import { AlertTriangle, Wind, FlaskConical, UserCheck } from 'lucide-react';

interface AckEntry {
  id:          string;
  alertType:   string;
  forestName:  string;
  userEmail:   string;
  isTest:      boolean;
  dismissedAt: string;
}

export function AlertAckLog({ entries }: { entries: AckEntry[] }) {
  if (!entries.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
        <UserCheck size={16} className="text-slate-400" />
        <h3 className="font-semibold text-slate-700 text-sm">Alarm-Quittierungen</h3>
        <span className="text-xs text-slate-400 ml-1">— wer hat welche Warnung wann bestätigt</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-400 border-b border-slate-100">
              <th className="text-left px-4 py-2">Typ</th>
              <th className="text-left px-4 py-2">Wald</th>
              <th className="text-left px-4 py-2">Nutzer</th>
              <th className="text-left px-4 py-2">Quittiert am</th>
              <th className="text-left px-4 py-2">Art</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center gap-1 font-semibold ${
                    e.alertType === 'STORM' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {e.alertType === 'STORM'
                      ? <Wind size={12} />
                      : <AlertTriangle size={12} />}
                    {e.alertType === 'STORM' ? 'Sturm' : 'SAR-Anomalie'}
                  </span>
                </td>
                <td className="px-4 py-2 font-medium text-slate-700">{e.forestName}</td>
                <td className="px-4 py-2 text-slate-500">{e.userEmail}</td>
                <td className="px-4 py-2 text-slate-400">
                  {new Date(e.dismissedAt).toLocaleString('de-DE')}
                </td>
                <td className="px-4 py-2">
                  {e.isTest
                    ? <span className="inline-flex items-center gap-1 text-violet-600"><FlaskConical size={11} /> Probe</span>
                    : <span className="text-slate-400">Echtdaten</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
