'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png';

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: string;
  zoom?: number;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function FlyToPosition({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prevRef = useRef<string>('');
  useEffect(() => {
    const key = `${lat},${lng}`;
    if (key !== prevRef.current) {
      prevRef.current = key;
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
    }
  }, [lat, lng, map]);
  return null;
}

export function LocationPickerMap({ lat, lng, onChange, height = '200px', zoom = 15 }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(
    lat != null && lng != null ? [lat, lng] : null
  );

  // Sync external changes
  useEffect(() => {
    if (lat != null && lng != null) setPosition([lat, lng]);
    else setPosition(null);
  }, [lat, lng]);

  const handleClick = (newLat: number, newLng: number) => {
    setPosition([newLat, newLng]);
    onChange(newLat, newLng);
  };

  const handleDragEnd = (e: L.DragEndEvent) => {
    const latlng = e.target.getLatLng();
    setPosition([latlng.lat, latlng.lng]);
    onChange(latlng.lat, latlng.lng);
  };

  const center: [number, number] = position ?? [51.1657, 10.4515];

  const markerRef = useRef<L.Marker>(null);
  const eventHandlers = useMemo(() => ({ dragend: handleDragEnd }), []);

  return (
    <div style={{ height, width: '100%' }} className="rounded-xl overflow-hidden border border-slate-200">
      <MapContainer
        center={center}
        zoom={position ? zoom : 6}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={TILE_URL} tileSize={512} zoomOffset={-1} />
        <ClickHandler onClick={handleClick} />
        {position && (
          <>
            <FlyToPosition lat={position[0]} lng={position[1]} />
            <Marker
              ref={markerRef}
              position={position}
              draggable
              eventHandlers={eventHandlers}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
