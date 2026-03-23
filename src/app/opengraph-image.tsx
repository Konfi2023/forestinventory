import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Forest Manager – Digitales Forstmanagement';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          background: 'linear-gradient(135deg, #0f2a1a 0%, #0f4a2a 50%, #1a6b3a 100%)',
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(74,222,128,0.08) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }} />

        {/* Logo area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px',
          }}>🌲</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>Forest</span>
            <div style={{ width: '10px', height: '5px', borderRadius: '2px', background: '#4ade80', margin: '0 4px 4px' }} />
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#4ade80', letterSpacing: '-0.5px' }}>Manager</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{
          fontSize: '64px', fontWeight: 800, color: '#f8fafc',
          lineHeight: 1.1, letterSpacing: '-1px', marginBottom: '20px',
        }}>
          Digitales Forstmanagement<br />
          <span style={{ color: '#4ade80' }}>für Europa.</span>
        </div>

        {/* Subline */}
        <div style={{ fontSize: '24px', color: 'rgba(248,250,252,0.7)', marginBottom: '40px', lineHeight: 1.4 }}>
          GIS-Karte · Satellitenüberwachung · EUDR · KI-Analyse
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {['🇩🇪 DSGVO-konform', '🛰️ Sentinel-2', '📋 EUDR-ready', '30 Tage kostenlos'].map(tag => (
            <div key={tag} style={{
              padding: '8px 16px', borderRadius: '24px',
              background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)',
              color: '#86efac', fontSize: '16px', fontWeight: 600,
            }}>{tag}</div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          position: 'absolute', top: '64px', right: '64px',
          fontSize: '18px', color: 'rgba(248,250,252,0.4)', fontWeight: 500,
        }}>
          forest-manager.eu
        </div>
      </div>
    ),
    { ...size },
  );
}
