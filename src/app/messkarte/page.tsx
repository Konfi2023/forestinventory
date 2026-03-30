import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forest Manager – Messkarte drucken',
  description: 'BHD-Messkarte im Kreditkartenformat ausdrucken (85,6 × 54 mm)',
  robots: 'noindex',
};

export default function MesskartePage() {
  return (
    <html>
      <head>
        <style>{`
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            color: #334155;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @media print {
            .no-print { display: none !important; }
            .print-page { padding: 0 !important; }
          }
        `}</style>
      </head>
      <body>
        {/* Screen: Print instructions */}
        <div className="no-print" style={{ padding: '2rem', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Forest Manager Messkarte</h1>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Drucke diese Seite auf A4 aus (100% Skalierung, nicht &quot;An Seite anpassen&quot;).
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
        <div className="print-page" style={{ padding: '2rem' }}>
          {/* Cut marks + card at exact 85.6mm × 54mm */}
          <div style={{ position: 'relative', width: '95.6mm', height: '64mm', margin: '0 auto' }}>
            {/* Corner cut marks */}
            {/* Top-left */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
            {/* Top-right */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
            {/* Bottom-left */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
            {/* Bottom-right */}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />

            {/* The card itself — 85.6mm × 54mm, centered with 5mm margin for cut marks */}
            <div style={{
              position: 'absolute',
              top: '5mm', left: '5mm',
              width: '85.6mm', height: '54mm',
              border: '0.3mm solid #e2e8f0',
              borderRadius: '3mm',
              overflow: 'hidden',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/messkarte.svg"
                alt="Forest Manager Messkarte"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>
          </div>

          {/* Dimensions label below card */}
          <p style={{
            textAlign: 'center', fontSize: '7pt', color: '#94a3b8', marginTop: '3mm',
          }}>
            85,6 × 54 mm (ISO/IEC 7810 ID-1) — Entlang der Markierungen ausschneiden
          </p>

          {/* Second card for backup */}
          <div style={{ position: 'relative', width: '95.6mm', height: '64mm', margin: '8mm auto 0' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '5mm', height: '0.2mm', background: '#94a3b8' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '0.2mm', height: '5mm', background: '#94a3b8' }} />
            <div style={{
              position: 'absolute', top: '5mm', left: '5mm',
              width: '85.6mm', height: '54mm',
              border: '0.3mm solid #e2e8f0', borderRadius: '3mm', overflow: 'hidden',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/messkarte.svg" alt="Forest Manager Messkarte" style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '7pt', color: '#94a3b8', marginTop: '3mm' }}>
            Ersatzkarte
          </p>
        </div>
      </body>
    </html>
  );
}
