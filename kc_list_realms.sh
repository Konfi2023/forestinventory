#!/bin/bash
TOKEN=$(curl -s -X POST 'http://localhost:8080/realms/master/protocol/openid-connect/token' \
  -d 'client_id=admin-cli&grant_type=password&username=admin&password=admin' \
  | python3 /root/kc_token.py)

echo "Realms:"
curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:8080/admin/realms' \
  > /root/kc_realms.json
python3 -c "import json; [print(r['realm']) for r in json.load(open('/root/kc_realms.json'))]"

echo "Required actions in forest-realm:"
curl -s -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8080/admin/realms/forest-realm/required-actions' \
  > /root/kc_actions2.json
python3 -c "import json; print(open('/root/kc_actions2.json').read()[:500])"
