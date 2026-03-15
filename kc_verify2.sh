#!/bin/bash
TOKEN=$(curl -s -X POST 'http://localhost:8080/realms/master/protocol/openid-connect/token' \
  -d 'client_id=admin-cli&grant_type=password&username=admin&password=admin' \
  | python3 /root/kc_token.py)

echo "--- Required actions (correct path) ---"
curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8080/admin/realms/forest-realm/authentication/required-actions' \
  > /root/kc_req_actions.json
python3 -c "
import json
actions = json.load(open('/root/kc_req_actions.json'))
if isinstance(actions, list):
    for a in actions:
        print(f\"alias={a.get('alias')} defaultAction={a.get('defaultAction')} enabled={a.get('enabled')}\")
else:
    print(actions)
"

echo "--- Disabling VERIFY_EMAIL default ---"
curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8080/admin/realms/forest-realm/authentication/required-actions/VERIFY_EMAIL' \
  > /root/kc_ve.json

python3 -c "
import json
a = json.load(open('/root/kc_ve.json'))
print('Before:', a.get('defaultAction'))
a['defaultAction'] = False
json.dump(a, open('/root/kc_ve_updated.json','w'))
print('Patched')
"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  'http://localhost:8080/admin/realms/forest-realm/authentication/required-actions/VERIFY_EMAIL' \
  -d @/root/kc_ve_updated.json)

echo "HTTP: $HTTP"
[ "$HTTP" = "204" ] && echo "SUCCESS" || echo "FAILED"
