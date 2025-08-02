// File path: scripts/setup-relations-simple.js

const HASURA_ENDPOINT = 'https://graph.onchainsuperheroes.xyz/v1/metadata';
const HASURA_ADMIN_SECRET = 'hasura_admin_JTlvlXn4qkkdmVwpTIpgzqkiTj2w7reRaIl';
const CHUNK_SIZE = 5;

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

const chunkArray = (arr, size) =>
  arr.reduce((chunks, item, idx) => {
    const chunkIndex = Math.floor(idx / size);
    if (!chunks[chunkIndex]) chunks[chunkIndex] = [];
    chunks[chunkIndex].push(item);
    return chunks;
  }, []);

// Relations GraphQL sans contraintes SQL
const RELATIONS = [
  // Player -> Hero (one-to-many)
  {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: 'Player',
      name: 'heroes',
      using: {
        manual_configuration: {
          remote_table: 'Hero',
          column_mapping: {
            'id': 'owner_id'
          }
        }
      }
    }
  },
  
  // Player -> Weapon (one-to-many)
  {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: 'Player',
      name: 'weapons',
      using: {
        manual_configuration: {
          remote_table: 'Weapon',
          column_mapping: {
            'id': 'owner_id'
          }
        }
      }
    }
  },
  
  // Hero -> Player (many-to-one)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'Hero',
      name: 'owner',
      using: {
        manual_configuration: {
          remote_table: 'Player',
          column_mapping: {
            'owner_id': 'id'
          }
        }
      }
    }
  },
  
  // Hero -> Weapon (one-to-one)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'Hero',
      name: 'equippedWeapon',
      using: {
        manual_configuration: {
          remote_table: 'Weapon',
          column_mapping: {
            'equippedWeapon_id': 'id'
          }
        }
      }
    }
  },
  
  // Weapon -> Player (many-to-one)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'Weapon',
      name: 'owner',
      using: {
        manual_configuration: {
          remote_table: 'Player',
          column_mapping: {
            'owner_id': 'id'
          }
        }
      }
    }
  },
  
  // Weapon -> Hero (one-to-many via equippedBy)
  {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: 'Weapon',
      name: 'equippedBy',
      using: {
        manual_configuration: {
          remote_table: 'Hero',
          column_mapping: {
            'id': 'equippedWeapon_id'
          }
        }
      }
    }
  },
  
  // Activity -> Hero (many-to-one)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'Activity',
      name: 'hero',
      using: {
        manual_configuration: {
          remote_table: 'Hero',
          column_mapping: {
            'heroId': 'id'
          }
        }
      }
    }
  },
  
  // Hero -> Activity (one-to-many)
  {
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: 'Hero',
      name: 'activities',
      using: {
        manual_configuration: {
          remote_table: 'Activity',
          column_mapping: {
            'id': 'heroId'
          }
        }
      }
    }
  },
  
  // WeaponRequest -> Player (many-to-one)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'WeaponRequest',
      name: 'requester',
      using: {
        manual_configuration: {
          remote_table: 'Player',
          column_mapping: {
            'requester': 'id'
          }
        }
      }
    }
  },
  
  // Stats entities -> Player (many-to-one)
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'DragmaUnderlingsUserStats',
      name: 'player',
      using: {
        manual_configuration: {
          remote_table: 'Player',
          column_mapping: {
            'player_id': 'id'
          }
        }
      }
    }
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'DragmaUserStats',
      name: 'player',
      using: {
        manual_configuration: {
          remote_table: 'Player',
          column_mapping: {
            'player_id': 'id'
          }
        }
      }
    }
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'FishingUserStats',
      name: 'player',
      using: {
        manual_configuration: {
          remote_table: 'Player',
          column_mapping: {
            'player_id': 'id'
          }
        }
      }
    }
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'GymUserStats',
      name: 'player',
      using: {
        manual_configuration: {
          remote_table: 'Player',
          column_mapping: {
            'player_id': 'id'
          }
        }
      }
    }
  },
  {
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: 'RemixUserStats',
      name: 'player',
      using: {
        manual_configuration: {
          remote_table: 'Player',
          column_mapping: {
            'player_id': 'id'
          }
        }
      }
    }
  }
];

(async () => {
  try {
    console.log('🔧 Setting up Hasura relations (without foreign key constraints)...');
    
    // Diviser les relations en chunks pour éviter les timeouts
    const chunks = chunkArray(RELATIONS, CHUNK_SIZE);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`⏳ Processing relations chunk ${i + 1}/${chunks.length}...`);
      
      for (const relation of chunk) {
        try {
          await fetchJson(relation);
          console.log(`✅ Applied relation: ${relation.args.name}`);
        } catch (err) {
          // Ignore les erreurs si la relation existe déjà
          if (err.message.includes('already exists') || err.message.includes('duplicate')) {
            console.log(`⚠️  Relation already exists: ${relation.args.name}`);
          } else {
            console.error(`❌ Error applying relation ${relation.args.name}:`, err.message);
          }
        }
      }
    }
    
    console.log('🎉 Done: Hasura relations configured!');
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
})(); 