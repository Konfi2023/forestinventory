import json

with open('/root/kc_actions.json') as f:
    actions = json.load(f)

for a in actions:
    print(f"alias={a.get('alias')} defaultAction={a.get('defaultAction')} enabled={a.get('enabled')}")
