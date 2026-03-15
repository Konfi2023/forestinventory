import json

with open('/root/kc_client.json') as f:
    c = json.load(f)

reg_url = 'https://forest-inventory.eu/api/auth/callback/keycloak-register'
if reg_url not in c.get('redirectUris', []):
    c.setdefault('redirectUris', []).append(reg_url)
    print(f'Added redirectUri: {reg_url}')
else:
    print(f'redirectUri already present')

if 'attributes' not in c:
    c['attributes'] = {}
c['attributes']['post.logout.redirect.uris'] = 'https://forest-inventory.eu/*##https://forest-inventory.eu'
print('Set post.logout.redirect.uris')

with open('/root/kc_client_updated.json', 'w') as f:
    json.dump(c, f)

print('Saved to /root/kc_client_updated.json')
