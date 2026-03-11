const endpointCandidates = [
  process.env.HASURA_ENDPOINT,
  process.env.HASURA_METADATA_ENDPOINT,
  process.env.HASURA_GRAPHQL_URL
    ? process.env.HASURA_GRAPHQL_URL.replace(/\/v1\/graphql\/?$/, '/v1/metadata')
    : undefined,
  'http://127.0.0.1:8080/v1/metadata',
].filter(Boolean);

const HASURA_ENDPOINT = endpointCandidates[0];
const HASURA_ADMIN_SECRET =
  process.env.HASURA_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET;

if (!HASURA_ENDPOINT) {
  console.error('Missing HASURA endpoint. Set HASURA_ENDPOINT.');
  process.exit(1);
}

if (!HASURA_ADMIN_SECRET) {
  console.error(
    'Missing HASURA admin secret. Set HASURA_ADMIN_SECRET (or HASURA_GRAPHQL_ADMIN_SECRET).'
  );
  process.exit(1);
}

const fetchJson = async (body) => {
  const res = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`HTTP ${res.status}: ${error}`);
  }

  return res.json();
};

// Relations à supprimer
const RELATIONS_TO_DELETE = [
  // Player relations
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'Player',
      relationship: 'heroes'
    }
  },
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'Player',
      relationship: 'weapons'
    }
  },
  
  // Hero relations
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'Hero',
      relationship: 'owner'
    }
  },
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'Hero',
      relationship: 'equippedWeapon'
    }
  },
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'Hero',
      relationship: 'activities'
    }
  },
  
  // Weapon relations
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'Weapon',
      relationship: 'owner'
    }
  },
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'Weapon',
      relationship: 'equippedBy'
    }
  },
  
  // Activity relations
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'Activity',
      relationship: 'hero'
    }
  },
  
  // WeaponRequest relations
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'WeaponRequest',
      relationship: 'requester'
    }
  },
  
  // Stats relations
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'DragmaUnderlingsUserStats',
      relationship: 'player'
    }
  },
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'DragmaUserStats',
      relationship: 'player'
    }
  },
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'FishingUserStats',
      relationship: 'player'
    }
  },
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'GymUserStats',
      relationship: 'player'
    }
  },
  {
    type: 'pg_drop_relationship',
    args: {
      source: 'default',
      table: 'RemixUserStats',
      relationship: 'player'
    }
  }
];

(async () => {
  try {
    console.log('🗑️  Deleting existing Hasura relations...');
    
    for (const relation of RELATIONS_TO_DELETE) {
      try {
        await fetchJson(relation);
        console.log(`✅ Deleted relation: ${relation.args.relationship}`);
      } catch (err) {
        // Ignore les erreurs si la relation n'existe pas
        if (err.message.includes('does not exist') || err.message.includes('not found')) {
          console.log(`⚠️  Relation does not exist: ${relation.args.relationship}`);
        } else {
          console.error(`❌ Error deleting relation ${relation.args.relationship}:`, err.message);
        }
      }
    }
    
    console.log('🎉 Done: All relations deleted!');
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
})(); 
