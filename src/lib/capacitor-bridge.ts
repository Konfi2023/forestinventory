/**
 * Capacitor Bridge — Abstraktionsschicht fuer native Plugins.
 * Erkennt ob die App in Capacitor oder im Browser laeuft und
 * verwendet entsprechend native oder Web-APIs.
 */

import { Capacitor } from '@capacitor/core';

/** Prueft ob die App als native Capacitor-App laeuft */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Prueft ob die App auf Android laeuft */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/** Prueft ob die App auf iOS laeuft */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

// --- Geolocation ---------------------------------------------------------

export async function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  if (isNativeApp()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    } catch (e) {
      console.warn('[capacitor-bridge] GPS error:', e);
      return null;
    }
  }

  // Browser fallback
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}

// --- Camera --------------------------------------------------------------

export async function takePhoto(): Promise<{ dataUrl: string; file: File | null } | null> {
  if (isNativeApp()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 2048,
      });
      if (!photo.dataUrl) return null;

      // DataUrl zu File konvertieren fuer Upload-Kompatibilitaet
      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      return { dataUrl: photo.dataUrl, file };
    } catch (e) {
      console.warn('[capacitor-bridge] Camera error:', e);
      return null;
    }
  }

  // Browser: kein programmatischer Kamera-Zugriff
  return null;
}

// --- Network Status ------------------------------------------------------

export async function isOnline(): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      return status.connected;
    } catch {
      return navigator.onLine;
    }
  }
  return navigator.onLine;
}

export async function onNetworkChange(callback: (connected: boolean) => void): Promise<() => void> {
  if (isNativeApp()) {
    try {
      const { Network } = await import('@capacitor/network');
      const handle = await Network.addListener('networkStatusChange', (status) => {
        callback(status.connected);
      });
      return () => handle.remove();
    } catch {
      // fallback below
    }
  }

  const onOn = () => callback(true);
  const onOff = () => callback(false);
  window.addEventListener('online', onOn);
  window.addEventListener('offline', onOff);
  return () => {
    window.removeEventListener('online', onOn);
    window.removeEventListener('offline', onOff);
  };
}

// --- Preferences (Offline Key-Value Store) -------------------------------

export async function setPreference(key: string, value: string): Promise<void> {
  if (isNativeApp()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
      return;
    } catch { /* fallback */ }
  }
  localStorage.setItem(key, value);
}

export async function getPreference(key: string): Promise<string | null> {
  if (isNativeApp()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const result = await Preferences.get({ key });
      return result.value;
    } catch { /* fallback */ }
  }
  return localStorage.getItem(key);
}

// --- App Lifecycle -------------------------------------------------------

export async function onAppStateChange(callback: (isActive: boolean) => void): Promise<() => void> {
  if (isNativeApp()) {
    try {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('appStateChange', (state) => {
        callback(state.isActive);
      });
      return () => handle.remove();
    } catch { /* fallback */ }
  }
  const handler = () => callback(!document.hidden);
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}

/** Bei App-Resume: Pending Trees syncen */
export async function setupAutoSync(syncFn: () => Promise<void>): Promise<void> {
  await onAppStateChange(async (isActive) => {
    if (isActive) {
      const online = await isOnline();
      if (online) syncFn();
    }
  });

  await onNetworkChange(async (connected) => {
    if (connected) syncFn();
  });
}
