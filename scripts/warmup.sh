#!/bin/bash
# Cloudflare Cache Warmup – nach jedem Deployment ausführen.
# Fetcht alle statischen JS/CSS-Chunks damit CF sie cached bevor echte Nutzer ankommen.

DOMAIN="https://forest-inventory.eu"
STATIC_DIR=".next/static"
PARALLEL=8  # Gleichzeitige Requests
SUCCESS=0
FAILED=0

echo "CF Warmup gestartet für $DOMAIN ..."

# Alle JS und CSS Chunks sammeln (keine Source Maps)
CHUNKS=$(find "$STATIC_DIR" -type f \( -name "*.js" -o -name "*.css" \) ! -name "*.map" 2>/dev/null)

if [ -z "$CHUNKS" ]; then
  echo "Keine Chunks gefunden – läuft dieser Script im Projektverzeichnis?"
  exit 1
fi

TOTAL=$(echo "$CHUNKS" | wc -l | tr -d ' ')
echo "Lade $TOTAL Assets in CF Cache ($PARALLEL parallel)..."

# GNU parallel oder xargs für parallele Requests
echo "$CHUNKS" | sed "s|$STATIC_DIR|$DOMAIN/_next/static|" | \
  xargs -P "$PARALLEL" -I{} sh -c '
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept-Encoding: gzip" "{}")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "304" ]; then
      echo "  ✓ {}"
    else
      echo "  ✗ {} ($STATUS)"
    fi
  '

# Wichtige Seiten warm machen
echo ""
echo "Wichtige Seiten aufwärmen..."
for PATH in "/" "/signin" "/app"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN$PATH")
  echo "  $STATUS $DOMAIN$PATH"
done

echo ""
echo "CF Warmup abgeschlossen."
