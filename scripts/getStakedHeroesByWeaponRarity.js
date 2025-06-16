const axios = require('axios');

// REMPLACEZ CETTE URL PAR L'URL DE VOTRE ENDPOINT GRAPHQL
const SUBGRAPH_URL = 'https://indexer.dev.hyperindex.xyz/97b71b3/v1/graphql';

// Vérification de l'URL du sous-graphe
if (SUBGRAPH_URL.includes('example/subgraph')) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("!!! VEUILLEZ REMPLACER LA VARIABLE SUBGRAPH_URL DANS LE SCRIPT PAR VOTRE VRAIE URL !!!");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  process.exit(1);
}

const BATCH_SIZE = 1000;

const query = `
  query GetStakedHeroes($where: Hero_bool_exp, $limit: Int) {
    Hero(
      where: $where,
      order_by: {id: asc},
      limit: $limit
    ) {
      id
      weapon {
        rarity
      }
    }
  }
`;

async function fetchAllStakedHeroes() {
  let allHeroes = [];
  let hasMore = true;
  let lastId = "";

  console.error("Fetching staked heroes using Hasura-style query...");

  while (hasMore) {
    const where_clause = {
      stakedSince: { _is_null: false }
    };
    if (lastId) {
      where_clause.id = { _gt: lastId };
    }

    try {
      const response = await axios.post(SUBGRAPH_URL, {
        query,
        variables: {
          where: where_clause,
          limit: BATCH_SIZE
        }
      });

      if (response.data.errors) {
        console.error('Error returned by subgraph:', JSON.stringify(response.data.errors, null, 2));
        hasMore = false;
        return null;
      }
      
      if (!response.data.data) {
          console.error('No data field in response from subgraph:', response.data);
          hasMore = false;
          return null;
      }

      const heroes = response.data.data.Hero;
      if (heroes && heroes.length > 0) {
        allHeroes = allHeroes.concat(heroes);
        lastId = heroes[heroes.length - 1].id;
        if (heroes.length < BATCH_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error('Error fetching data from subgraph:', error.message);
      if(error.response) {
        console.error('Subgraph response data:', JSON.stringify(error.response.data, null, 2));
      }
      hasMore = false;
      return null;
    }
  }
  console.error(`Fetched a total of ${allHeroes.length} staked heroes.`);
  return allHeroes;
}

async function getStakedHeroesByWeaponRarity() {
  const heroes = await fetchAllStakedHeroes();

  if (!heroes) {
    // Errors are already logged to stderr
    return;
  }

  const rarityMap = [
    'common',
    'uncommon',
    'rare',
    'epic',
    'heroic',
    'legendary',
    'mythic'
  ];

  const rarityCounts = {};
  rarityMap.forEach(rarityName => {
      rarityCounts[rarityName] = 0;
  });

  let totalStakedWithWeapon = 0;

  heroes.forEach(hero => {
    if (hero.weapon && hero.weapon.rarity != null) {
      const rarityIndex = parseInt(hero.weapon.rarity, 10);
      if (rarityIndex >= 0 && rarityIndex < rarityMap.length) {
        const rarityName = rarityMap[rarityIndex];
        rarityCounts[rarityName]++;
        totalStakedWithWeapon++;
      }
    }
  });

  const cumulativeCounts = {};
  let cumulativeTotal = 0;
  for (const rarityName of rarityMap) {
      cumulativeTotal += rarityCounts[rarityName];
      cumulativeCounts[rarityName] = cumulativeTotal;
  }

  const result = {
      ...rarityCounts,
      total: totalStakedWithWeapon,
      cumulative: cumulativeCounts
  };

  console.log(JSON.stringify(result, null, 2));
}

getStakedHeroesByWeaponRarity(); 
