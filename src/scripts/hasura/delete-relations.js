// File path: scripts/delete-relations.js

const HASURA_ENDPOINT = 'https://graph.onchainsuperheroes.xyz/v1/metadata';
const HASURA_ADMIN_SECRET = 'hasura_admin_JTlvlXn4qkkdmVwpTIpgzqkiTj2w7reRaIl';

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