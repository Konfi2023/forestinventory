'use client';

import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface UserPos { lat: number; lng: number; accuracy: number; }

export function UserLocationMarker() {
  const map = useMap();
  const [pos, setPos] = useState<UserPos | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!pos) return;

    const latlng: L.LatLngExpression = [pos.lat, pos.lng];

    // Blue dot icon
    if (!markerRef.current) {
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:16px;height:16px;border-radius:50%;
          background:#3b82f6;border:3px solid white;
          box-shadow:0 0 8px rgba(59,130,246,0.6);
          animation:gps-pulse 2s ease-out infinite;
        "></div>
        <style>
          @keyframes gps-pulse {
            0% { box-shadow:0 0 0 0 rgba(59,130,246,0.5); }
            70% { box-shadow:0 0 0 16px rgba(59,130,246,0); }
            100% { box-shadow:0 0 0 0 rgba(59,130,246,0); }
          }
        </style>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      markerRef.current = L.marker(latlng, { icon, interactive: false, zIndexOffset: 1000 }).addTo(map);
    } else {
      markerRef.current.setLatLng(latlng);
    }

    // Accuracy circle
    if (!circleRef.current) {
      circleRef.current = L.circle(latlng, {
        radius: Math.min(pos.accuracy, 200),
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
        weight: 1,
        opacity: 0.3,
        interactive: false,
      }).addTo(map);
    } else {
      circleRef.current.setLatLng(latlng);
      circleRef.current.setRadius(Math.min(pos.accuracy, 200));
    }

    return () => {};
  }, [pos, map]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      circleRef.current?.remove();
    };
  }, []);

  return null;
}
