#!/bin/bash

TOKEN=$(curl -s -X POST 'http://localhost:8080/realms/master/protocol/openid-connect/token' \
  -d 'client_id=admin-cli&grant_type=password&username=admin&password=admin' \
  | python3 /root/kc_token.py)

echo "Token acquired."

echo "--- Listing all required actions ---"
curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8080/admin/realms/forest-realm/required-actions' \
  > /root/kc_actions.json
python3 /root/kc_list_actions.py

echo "--- Disabling VERIFY_EMAIL as default action ---"
curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8080/admin/realms/forest-realm/required-actions/VERIFY_EMAIL' \
  > /root/kc_verify_action.json

python3 /root/kc_patch_action.py

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  'http://localhost:8080/admin/realms/forest-realm/required-actions/VERIFY_EMAIL' \
  -d @/root/kc_verify_action_updated.json)

echo "HTTP Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" = "204" ]; then
  echo "SUCCESS"
else
  echo "FAILED"
  cat /root/kc_verify_action.json
fi
