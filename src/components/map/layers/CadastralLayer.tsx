'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WMSTileLayer, useMap, useMapEvents } from 'react-leaflet';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import statesGeoJson from '../../../../data/de_bundeslaender_vg2500.json';

interface CadastralLayerProps {
  visible: boolean;
}

type ServiceConfig = {
  id: string;
  name: string;
  url: string;
  layer: string;
  attribution: string;
  version: string;
  invert: boolean;
  minZoom: number;
  token?: string;
  geoJsonName?: string;
  bounds?: number[];
  transparent?: boolean;
  format?: string;
  styles?: string;
};

// ─── Europa-Fallback ───────────────────────────────────────────────────────────
const SERVICE_EURO: ServiceConfig = {
  id: 'EURO',
  name: 'EuroGeographics',
  url: 'https://www.mapsforeurope.org/maps/wms',
  layer: 'cadastral_cadastralparcel',
  attribution: '© EuroGeographics',
  version: '1.3.0',
  invert: true,
  minZoom: 13,
  token: 'ImV1cm9nZW9ncmFwaGljc19yZWdpc3RlcmVkXzMzNzMzMCI.HG6Lyg.LwozhpTgX1RBK9v9tNRUkK4qBKI',
  format: 'image/png',
  transparent: true,
};

// ─── Deutsche Bundesländer + Ausland ──────────────────────────────────────────
const LOCAL_SERVICES: ServiceConfig[] = [
  {
    id: 'DE_BW', geoJsonName: 'Baden-Württemberg',
    name: 'Baden-Württemberg (ALKIS)',
    url: 'https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_LGL-BW_ALKIS_Basis_transparent',
    layer: 'nora:ALKIS_Basis_transparent', attribution: '© LGL Baden-Württemberg',
    version: '1.3.0', invert: true, minZoom: 15, format: 'image/png', transparent: true,
  },
  {
    id: 'DE_BY', geoJsonName: 'Bayern',
    name: 'Bayern (Parzellarkarte)',
    url: 'https://geoservices.bayern.de/od/wms/alkis/v1/parzellarkarte',
    layer: 'by_alkis_parzellarkarte_umr_gelb', attribution: '© Bayerische Vermessungsverwaltung',
    version: '1.1.1', invert: false, minZoom: 14, format: 'image/png', transparent: true,
  },
  {
    id: 'DE_NW', geoJsonName: 'Nordrhein-Westfalen',
    name: 'Nordrhein-Westfalen (ALKIS gelb)',
    url: 'https://www.wms.nrw.de/geobasis/wms_nw_alkis_gelb',
    layer: 'adv_alkis_flurstuecke', attribution: '© Geobasis NRW',
    version: '1.1.1', invert: false, minZoom: 17, format: 'image/png', transparent: true, styles: 'Gelb',
  },
  {
    id: 'DE_MV', geoJsonName: 'Mecklenburg-Vorpommern',
    name: 'Mecklenburg-Vorpommern (ALKIS INSPIRE)',
    url: 'https://www.geodaten-mv.de/dienste/inspire_cp_alkis_view',
    layer: 'CP.CadastralParcel', attribution: '© GeoBasis-DE/M-V',
    version: '1.1.1', invert: false, minZoom: 15, format: 'image/png', transparent: true,
    styles: 'CP.CadastralParcel.OutlinesOnly',
  },
  {
    id: 'DE_SN', geoJsonName: 'Sachsen',
    name: 'Sachsen (ALKIS INSPIRE)',
    url: 'https://geodienste.sachsen.de/iwms_geosn_flurstuecke/guest',
    layer: 'CP.CadastralParcel', attribution: '© Geodaten Sachsen',
    version: '1.1.1', invert: false, minZoom: 15, format: 'image/png', transparent: true,
    styles: 'CP.CadastralParcel.OutlinesOnly',
  },
  {
    id: 'DE_HE', geoJsonName: 'Hessen',
    name: 'Hessen (ALKIS INSPIRE CP)',
    url: 'https://inspire-hessen.de/ows/services/org.2.d66ec21e-39e7-45c4-bf68-438e8baea882_wms',
    layer: 'CP.CadastralParcel', attribution: '© HVBG / Geoportal Hessen',
    version: '1.1.1', invert: false, minZoom: 16, format: 'image/png', transparent: true,
    styles: 'CP.CadastralParcel.BoundariesOnly',
  },
  {
    id: 'DE_ST', geoJsonName: 'Sachsen-Anhalt',
    name: 'Sachsen-Anhalt (ALKIS Flurgrenzen)',
    url: 'https://geodatenportal.sachsen-anhalt.de/wss/service/ST_LVermGeo_ALKIS_WMS_Gemarkung_Flur_OpenData/guest',
    layer: 'flur', attribution: '© LVermGeo Sachsen-Anhalt',
    version: '1.1.1', invert: false, minZoom: 12, format: 'image/png', transparent: true, styles: 'Farbe',
  },
  {
    id: 'DE_TH', geoJsonName: 'Thüringen',
    name: 'Thüringen (ALKIS INSPIRE CP)',
    url: 'https://www.geoproxy.geoportal-th.de/geoproxy/services/INSPIREcp',
    layer: 'CP.CadastralParcel', attribution: '© GDI-Th / TLBG',
    version: '1.1.1', invert: false, minZoom: 16, format: 'image/png', transparent: true,
    styles: 'CP.CadastralParcel.Default',
  },
  {
    id: 'DE_BB', geoJsonName: 'Brandenburg',
    name: 'Brandenburg (LGB)',
    url: 'https://isk.geobasis-bb.de/mapproxy/alkis/service/wms',
    layer: 'adv_alkis_flurstuecke_flurstuecke', attribution: '© LGB Brandenburg',
    version: '1.1.1', invert: true, minZoom: 15,
  },
  // Ausland (bounds-basiert)
  {
    id: 'HR', name: 'Kroatien (DGU)',
    url: 'https://api.uredjenazemlja.hr/services/inspire/cp_wms/wms',
    layer: 'cp:CP.CadastralParcel', attribution: '© DGU Hrvatska',
    version: '1.3.0', invert: true, minZoom: 14,
    bounds: [42.3, 13.0, 46.6, 19.5], format: 'image/png', transparent: true,
  },
  {
    id: 'ES', name: 'Spanien (Catastro)',
    url: 'https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx',
    layer: 'PARCELA', attribution: '© Catastro España',
    version: '1.1.1', invert: true, minZoom: 14,
    bounds: [36.0, -9.5, 43.8, 4.5], format: 'image/png', transparent: true,
  },
  {
    id: 'AT', name: 'Österreich (via EuroGeographics)',
    url: 'https://www.mapsforeurope.org/maps/wms',
    layer: 'cadastral_cadastralparcel', attribution: '© BEV / EuroGeographics',
    version: '1.3.0', invert: true, minZoom: 14,
    token: 'ImV1cm9nZW9ncmFwaGljc19yZWdpc3RlcmVkXzMzNzMzMCI.HG6Lyg.LwozhpTgX1RBK9v9tNRUkK4qBKI',
    bounds: [46.3, 9.5, 49.1, 17.2], format: 'image/png', transparent: true,
  },
  {
    id: 'CH', name: 'Schweiz (Swisstopo)',
    url: 'https://wms.geo.admin.ch/',
    layer: 'ch.swisstopo.amtliches-vermessungswerk', attribution: '© Swisstopo',
    version: '1.3.0', invert: false, minZoom: 14,
    bounds: [45.8, 5.9, 47.9, 10.5], format: 'image/png', transparent: true,
  },
  {
    id: 'PL', name: 'Polen (Geoportal)',
    url: 'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow',
    layer: 'dzialki', attribution: '© Geoportal.gov.pl',
    version: '1.1.1', invert: true, minZoom: 14,
    bounds: [49.0, 14.0, 54.9, 24.2], format: 'image/png', transparent: true,
  },
];

// ─── Komponente ────────────────────────────────────────────────────────────────
// Minimale Positionsänderung (in Grad), ab der die teure GeoJSON-Suche
// neu ausgeführt wird. 0.3° ≈ ~30 km — genug um Bundeslandwechsel zu erkennen.
const REGION_THRESHOLD_DEG = 0.3;

export const CadastralLayer = React.memo(function CadastralLayer({ visible }: CadastralLayerProps) {
  const map = useMap();
  const [isZoomedIn, setIsZoomedIn]       = useState(false);
  const [activeService, setActiveService] = useState<ServiceConfig>(SERVICE_EURO);

  // Cache: letzte Position bei der die Region ermittelt wurde
  const lastCheckedCenter = useRef<{ lat: number; lng: number } | null>(null);
  // Zuletzt ermittelter Dienst (als Ref damit checkRegionAndZoom immer den
  // aktuellen Wert liest, ohne stale-closure-Probleme)
  const activeServiceRef = useRef<ServiceConfig>(SERVICE_EURO);

  const checkRegionAndZoom = () => {
    const zoom   = map.getZoom();
    const center = map.getCenter();

    // ── Region neu bestimmen? ──────────────────────────────────────────────
    const last = lastCheckedCenter.current;
    const tooFarMoved = !last
      || Math.abs(center.lat - last.lat) > REGION_THRESHOLD_DEG
      || Math.abs(center.lng - last.lng) > REGION_THRESHOLD_DEG;

    if (tooFarMoved) {
      lastCheckedCenter.current = { lat: center.lat, lng: center.lng };

      const turfPt = point([center.lng, center.lat]);
      let matched: ServiceConfig | undefined;

      // 1. Deutschland: GeoJSON-basiert (teuer — nur wenn wirklich nötig)
      const found = (statesGeoJson as any).features.find((f: any) =>
        booleanPointInPolygon(turfPt, f),
      );
      if (found?.properties) {
        matched = LOCAL_SERVICES.find(s => s.geoJsonName === found.properties.GEN);
      }

      // 2. Ausland: Bounding-Box-Fallback (billig)
      if (!matched) {
        matched = LOCAL_SERVICES.find(s => {
          if (s.geoJsonName || !s.bounds) return false;
          const [S, W, N, E] = s.bounds;
          return center.lat >= S && center.lat <= N && center.lng >= W && center.lng <= E;
        });
      }

      const next = matched ?? SERVICE_EURO;
      if (activeServiceRef.current.id !== next.id) {
        activeServiceRef.current = next;
        setActiveService(next);
      }
    }

    // ── Zoom-Threshold immer prüfen (billig) ──────────────────────────────
    const deepEnough = zoom >= activeServiceRef.current.minZoom;
    if (deepEnough !== isZoomedIn) setIsZoomedIn(deepEnough);
  };

  useMapEvents({ zoomend: checkRegionAndZoom, moveend: checkRegionAndZoom });
  useEffect(() => { checkRegionAndZoom(); }, []);

  const wmsParams = useMemo(() => {
    const p: any = {
      layers:      activeService.layer,
      format:      activeService.format ?? 'image/png',
      transparent: activeService.transparent ?? true,
      version:     activeService.version,
      attribution: activeService.attribution,
      styles:      activeService.styles ?? '',
    };
    if (activeService.token) p.token = activeService.token;
    return p;
  }, [activeService]);

  if (!visible || !isZoomedIn) return null;

  return (
    <WMSTileLayer
      key={`cadastral-${activeService.id}`}
      url={activeService.url}
      params={wmsParams}
      opacity={1.0}
      zIndex={10}
      maxZoom={22}
      className={activeService.invert ? 'leaflet-layer-invert' : ''}
    />
  );
});
