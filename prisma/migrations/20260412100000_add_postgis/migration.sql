-- PostGIS Extension aktivieren
CREATE EXTENSION IF NOT EXISTS postgis;

-- Geometry-Spalte an Forest (parallel zu geoJson)
ALTER TABLE "app"."Forest" ADD COLUMN "geom" geometry(Geometry, 4326);

-- Bestehende GeoJSON-Daten in geometry konvertieren (ST_Force2D für 3D-Koordinaten)
UPDATE "app"."Forest"
SET "geom" = ST_Force2D(ST_SetSRID(
  ST_GeomFromGeoJSON(
    CASE
      WHEN "geoJson" #>> '{features,0,geometry}' IS NOT NULL
        THEN "geoJson" #>> '{features,0,geometry}'
      WHEN "geoJson" #>> '{geometry}' IS NOT NULL
        THEN "geoJson" #>> '{geometry}'
      ELSE "geoJson"::text
    END
  ), 4326))
WHERE "geoJson" IS NOT NULL;

-- Spatial Index für schnelle räumliche Abfragen
CREATE INDEX "Forest_geom_idx" ON "app"."Forest" USING GIST ("geom");

-- Trigger: geom automatisch aktualisieren wenn geoJson sich ändert
CREATE OR REPLACE FUNCTION app.sync_forest_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."geoJson" IS NOT NULL THEN
    BEGIN
      NEW."geom" := ST_Force2D(ST_SetSRID(
        ST_GeomFromGeoJSON(
          CASE
            WHEN NEW."geoJson" #>> '{features,0,geometry}' IS NOT NULL
              THEN NEW."geoJson" #>> '{features,0,geometry}'
            WHEN NEW."geoJson" #>> '{geometry}' IS NOT NULL
              THEN NEW."geoJson" #>> '{geometry}'
            ELSE NEW."geoJson"::text
          END
        ), 4326));
    EXCEPTION WHEN OTHERS THEN
      NEW."geom" := NULL;
    END;
  ELSE
    NEW."geom" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forest_sync_geom
  BEFORE INSERT OR UPDATE OF "geoJson" ON "app"."Forest"
  FOR EACH ROW EXECUTE FUNCTION app.sync_forest_geom();
