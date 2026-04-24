'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  points: [number, number][]; // [lat, lng]
  center: [number, number];
  color: string;
}

function FitToBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    try {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
    } catch { /* ignore */ }
  }, [map, points]);
  return null;
}

export function PathPreviewMap({ points, center, color }: Props) {
  const start = points[0];
  const end   = points[points.length - 1];

  return (
    <MapContainer
      center={center}
      zoom={16}
      scrollWheelZoom={false}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Polyline positions={points} pathOptions={{ color, weight: 5, opacity: 0.9 }} />
      {start && (
        <CircleMarker
          center={start}
          radius={7}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#10b981', fillOpacity: 1 }}
        />
      )}
      {end && points.length > 1 && (
        <CircleMarker
          center={end}
          radius={7}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#ef4444', fillOpacity: 1 }}
        />
      )}
      <FitToBounds points={points} />
    </MapContainer>
  );
}
