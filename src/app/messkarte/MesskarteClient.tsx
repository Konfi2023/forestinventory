'use client';

function CutMarks() {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
    </>
  );
}

function Card() {
  return (
    <div style={{
      position: 'absolute', top: '5mm', left: '5mm',
      width: '85.6mm', height: '54mm',
      border: '0.3mm solid #e2e8f0', borderRadius: '3mm', overflow: 'hidden',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/messkarte.svg" alt="Forest Manager Messkarte" style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

export function MesskarteClient() {
  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 15mm; }
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      {/* Screen instructions */}
      <div className="no-print" style={{ padding: '2rem', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e293b' }}>
          Forest Manager Messkarte
        </h1>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Drucke diese Seite auf A4 aus (100 % Skalierung, nicht &quot;An Seite anpassen&quot;).
          Schneide die Karte entlang der Schnittmarken aus.
          Für eine langlebige Karte: auf dickes Papier drucken und laminieren.
        </p>
        <button
          onClick={() => window.print()}
          style={{
            background: '#16a34a', color: 'white', border: 'none', padding: '0.75rem 2rem',
            borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Jetzt drucken
        </button>
      </div>

      {/* Print area */}
      <div style={{ padding: '2rem' }}>
        {/* Card 1 */}
        <div style={{ position: 'relative', width: '95.6mm', height: '64mm', margin: '0 auto' }}>
          <CutMarks />
          <Card />
        </div>
        <p style={{ textAlign: 'center', fontSize: '7pt', color: '#94a3b8', marginTop: '3mm' }}>
          85,6 &times; 54 mm (ISO/IEC 7810 ID-1) — Entlang der Markierungen ausschneiden
        </p>

        {/* Card 2 (backup) */}
        <div style={{ position: 'relative', width: '95.6mm', height: '64mm', margin: '8mm auto 0' }}>
          <CutMarks />
          <Card />
        </div>
        <p style={{ textAlign: 'center', fontSize: '7pt', color: '#94a3b8', marginTop: '3mm' }}>
          Ersatzkarte
        </p>
      </div>
    </>
  );
}
