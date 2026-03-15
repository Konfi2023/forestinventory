import json

c = json.load(open('/tmp/client.json'))
print("redirectUris:")
for u in c.get('redirectUris', []):
    print(" ", u)
print("post.logout.redirect.uris:", c.get('attributes', {}).get('post.logout.redirect.uris', 'NOT SET'))
