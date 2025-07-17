#!/bin/bash
# File path: ./get_hero_level.sh

# Check for required argument
if [ -z "$1" ]; then
  echo "Usage: $0 <hero_id>"
  exit 1
fi

HERO_ID="$1"
HASURA_ENDPOINT="https://graph.onchainsuperheroes.xyz/v1/graphql"
HASURA_ADMIN_SECRET="hasura_admin_JTlvlXn4qkkdmVwpTIpgzqkiTj2w7reRaIl"

# Perform GraphQL query to get hero level by ID
curl -s -X POST "$HASURA_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "x-hasura-admin-secret: $HASURA_ADMIN_SECRET" \
  -d @- <<EOF
{
  "query": "query GetHeroLevel { Hero_by_pk(id: \"$HERO_ID\") { id level } }"
}
EOF

