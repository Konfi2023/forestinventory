#!/bin/bash

TOKEN=$(curl -s -X POST 'http://localhost:8080/realms/master/protocol/openid-connect/token' \
  -d 'client_id=admin-cli&grant_type=password&username=admin&password=admin' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

CLIENT_UUID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8080/admin/realms/forest-realm/clients?clientId=forest-app' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)[0]["id"])')

echo "Client UUID: $CLIENT_UUID"

# Save current client JSON to file
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/admin/realms/forest-realm/clients/$CLIENT_UUID" \
  > /root/kc_client.json

echo "Current redirectUris:"
python3 -c 'import json; c=json.load(open("/root/kc_client.json")); print(json.dumps(c.get("redirectUris",[]), indent=2))'

# Patch the JSON
python3 /root/kc_patch.py

# PUT the updated client
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/admin/realms/forest-realm/clients/$CLIENT_UUID" \
  -d @/root/kc_client_updated.json)

echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "204" ]; then
  echo "SUCCESS"
else
  echo "FAILED - response:"
  cat /root/kc_client_updated.json | head -5
fi
