import sys, json
data = json.load(sys.stdin)
print(data["access_token"])
