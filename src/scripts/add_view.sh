#!/bin/bash

HASURA_URL=http://localhost:8898
HASURA_ADMIN_SECRET=hasura_admin_JTlvlXn4qkkdmVwpTIpgzqkiTj2w7reRaIl

# Récupère toutes les tables et applique la permission "select" pour le rôle "public"
curl -s -X POST "$HASURA_URL/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $HASURA_ADMIN_SECRET" \
  -d '{"type":"export_metadata","args":{}}' | \
  jq -c '.sources[0].tables[] | .table' | while read -r table; do

  echo "Applying select permission on: $table"

  curl -s -X POST "$HASURA_URL/v1/metadata" \
    -H "Content-Type: application/json" \
    -H "x-hasura-admin-secret: $HASURA_ADMIN_SECRET" \
    -d '{
      "type": "pg_create_select_permission",
      "args": {
        "source": "default",
        "table": '"$table"',
        "role": "public",
        "permission": {
          "columns": "*",
          "filter": {}
        }
      }
    }'
done

