#!/bin/bash
# Liste alle User
psql -U forestuser -d forestdb -c "SELECT id, email, \"isSystemAdmin\" FROM \"User\" ORDER BY \"createdAt\";"
