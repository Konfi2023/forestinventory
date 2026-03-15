import json

with open('/root/kc_verify_action.json') as f:
    content = f.read().strip()

if not content or content == 'null':
    print("VERIFY_EMAIL action not found or empty, trying from actions list...")
    with open('/root/kc_actions.json') as f:
        actions = json.load(f)
    action = next((a for a in actions if a.get('alias') == 'VERIFY_EMAIL'), None)
    if not action:
        print("ERROR: VERIFY_EMAIL not found in actions list")
        exit(1)
else:
    action = json.loads(content)

print(f"Current: defaultAction={action.get('defaultAction')}, enabled={action.get('enabled')}")
action['defaultAction'] = False

with open('/root/kc_verify_action_updated.json', 'w') as f:
    json.dump(action, f)

print("Written to kc_verify_action_updated.json")
