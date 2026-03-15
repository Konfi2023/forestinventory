#!/bin/bash
TOKEN=$(curl -s -X POST 'http://localhost:8080/realms/master/protocol/openid-connect/token' \
  -d 'client_id=admin-cli&grant_type=password&username=admin&password=admin' \
  | python3 /root/kc_token.py)

echo "--- Realm verifyEmail setting ---"
curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8080/admin/realms/forest-realm' \
  > /root/kc_realm.json
python3 -c "import json; r=json.load(open('/root/kc_realm.json')); print('verifyEmail:', r.get('verifyEmail'))"

echo "--- Disabling verifyEmail in realm ---"
python3 -c "
import json
r = json.load(open('/root/kc_realm.json'))
r['verifyEmail'] = False
json.dump(r, open('/root/kc_realm_updated.json','w'))
print('Patched verifyEmail to False')
"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  'http://localhost:8080/admin/realms/forest-realm' \
  -d @/root/kc_realm_updated.json)

echo "HTTP: $HTTP"
[ "$HTTP" = "204" ] && echo "SUCCESS — verifyEmail disabled for realm" || echo "FAILED"
