#!/bin/bash
TOKEN=$(curl -s -X POST 'http://localhost:8080/realms/master/protocol/openid-connect/token' \
  -d 'client_id=admin-cli&grant_type=password&username=admin&password=admin' \
  | python3 /root/kc_token.py)

CLIENT_UUID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8080/admin/realms/forest-realm/clients?clientId=forest-app' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)[0]["id"])')

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/admin/realms/forest-realm/clients/$CLIENT_UUID" \
  > /tmp/client.json

python3 /root/kc_check_uris.py
