#!/usr/bin/env node

/**
 * OCH Dragma Statistics Script
 * Fetches and displays dragma heroes statistics
 * Usage: node src/scripts/dragma-stats.js [wallet-address]
 */

const https = require('https');
const http = require('http');

// Hardcoded configuration
// const GRAPHQL_ENDPOINT = 'https://graph.onchainsuperheroes.xyz/v1/graphql';
// const HASURA_SECRET = 'hasura_admin_JTlvlXn4qkkdmVwpTIpgzqkiTj2w7reRaIl';

const GRAPHQL_ENDPOINT = 'http://localhost:8080/v1/graphql';
const HASURA_SECRET = 'testing';

// Zone mapping for Dragma
const STAKING_TYPE_TO_ZONE = {
  'DRAGMA_TAILS': 0,
  'DRAGMA_LEGS': 1,
  'DRAGMA_TORSO': 2,
  'DRAGMA_HEAD': 3,
};

const ZONE_NAMES = {
  0: 'Tails',
  1: 'Legs', 
  2: 'Torso',
  3: 'Head',
};

/**
 * Make GraphQL request
 */
async function makeGraphQLRequest(endpoint, query, variables = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify({ query, variables });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-hasura-admin-secret': HASURA_SECRET
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.errors) {
            reject(new Error(`GraphQL Errors: ${JSON.stringify(response.errors)}`));
          } else {
            resolve(response.data);
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Fetch all dragma heroes (optionally filtered by wallet)
 */
async function getAllDragmaHeroes(walletAddress = null) {
  const allHeroes = [];
  let hasNextPage = true;
  let offset = 0;
  const limit = 1000;

  if (walletAddress) {
    console.log(`🔍 Fetching dragma heroes for wallet: ${walletAddress}...`);
  } else {
    console.log('🔍 Fetching all dragma heroes...');
  }

  while (hasNextPage) {
    // Build where clause based on wallet filter
    let whereClause = {
      staked: { _eq: true },
      stakingType: { _in: ["DRAGMA_TAILS", "DRAGMA_LEGS", "DRAGMA_TORSO", "DRAGMA_HEAD"] }
    };

    if (walletAddress) {
      // Try different Hasura syntax for filtering by owner
      whereClause.owner_id = { _eq: walletAddress.toLowerCase() };
    }

    const query = `
      query GetDragmaHeroes($limit: Int!, $offset: Int!, $where: Hero_bool_exp!) {
        Hero(
          where: $where
          limit: $limit
          offset: $offset
          order_by: { id: asc }
        ) {
          id
          level
          stakingType
        }
      }
    `;

    try {
      console.log(`📄 Page ${Math.floor(offset / limit) + 1}...`);
      const data = await makeGraphQLRequest(GRAPHQL_ENDPOINT, query, { 
        limit, 
        offset, 
        where: whereClause 
      });
      
      const heroes = data.Hero || [];
      allHeroes.push(...heroes);

      console.log(`   ${heroes.length} heroes retrieved`);

      if (heroes.length < limit) {
        hasNextPage = false;
      } else {
        offset += limit;
      }

    } catch (error) {
      console.error('❌ GraphQL error:', error.message);
      throw error;
    }
  }

  console.log(`✅ Total: ${allHeroes.length} dragma heroes\n`);
  return allHeroes;
}

/**
 * Display statistics
 */
function displayStats(heroes, walletAddress = null) {
  if (heroes.length === 0) {
    console.log('No dragma heroes found.');
    return;
  }

  console.log('='.repeat(60));
  console.log('🐉 OCH DRAGMA STATISTICS');
  if (walletAddress) {
    console.log(`🔍 Wallet: ${walletAddress}`);
  }
  console.log('='.repeat(60));
  console.log(`Generated: ${new Date().toLocaleString()}\n`);

  // General stats
  const totalHeroes = heroes.length;

  console.log('📊 GENERAL SUMMARY:');
  console.log(`Total heroes staked: ${totalHeroes.toLocaleString()}\n`);

  // Group by zone
  const heroesByZone = { 0: [], 1: [], 2: [], 3: [] };
  const levelDistribution = { total: {}, 0: {}, 1: {}, 2: {}, 3: {} };
  let totalLevelSum = 0;

  heroes.forEach(hero => {
    const zone = STAKING_TYPE_TO_ZONE[hero.stakingType];
    const level = parseInt(hero.level);
    
    if (zone !== undefined) {
      heroesByZone[zone].push(hero);
      levelDistribution[zone][level] = (levelDistribution[zone][level] || 0) + 1;
    }
    
    levelDistribution.total[level] = (levelDistribution.total[level] || 0) + 1;
    totalLevelSum += level;
  });

  // Zone breakdown
  console.log('🗺️  BREAKDOWN BY ZONE:');
  Object.entries(ZONE_NAMES).forEach(([zoneId, zoneName]) => {
    const zone = parseInt(zoneId);
    const zoneHeroes = heroesByZone[zone];
    const count = zoneHeroes.length;
    const percentage = totalHeroes > 0 ? ((count / totalHeroes) * 100).toFixed(1) : '0.0';
    
    console.log(`\nZone ${zone} - ${zoneName}:`);
    console.log(`  Heroes: ${count.toLocaleString()} (${percentage}%)`);
    
    if (count > 0) {
      const zoneLevelSum = zoneHeroes.reduce((sum, hero) => sum + parseInt(hero.level), 0);
      const avgLevel = (zoneLevelSum / count).toFixed(2);
      console.log(`  Average level: ${avgLevel}`);
      
      const zoneLevels = Object.keys(levelDistribution[zone]).map(Number).sort((a, b) => a - b);
      if (zoneLevels.length > 0) {
        const minLevel = Math.min(...zoneLevels);
        const maxLevel = Math.max(...zoneLevels);
        console.log(`  Level range: ${minLevel} - ${maxLevel}`);
      }
    }
  });

  // Global average level
  const globalAvgLevel = totalHeroes > 0 ? (totalLevelSum / totalHeroes).toFixed(2) : '0.00';
  console.log(`\n📈 GLOBAL AVERAGE LEVEL: ${globalAvgLevel}\n`);

  // Level distribution
  console.log('📊 LEVEL DISTRIBUTION:');
  const allLevels = Object.keys(levelDistribution.total).map(Number).sort((a, b) => a - b);
  
  if (allLevels.length > 0) {
    const minLevel = Math.min(...allLevels);
    const maxLevel = Math.max(...allLevels);
    console.log(`Level range: ${minLevel} - ${maxLevel}`);
    console.log(`Unique levels: ${allLevels.length}\n`);
    
    // Top levels (showing all levels with count)
    const levelCounts = Object.entries(levelDistribution.total)
      .map(([level, count]) => ({ level: parseInt(level), count }))
      .sort((a, b) => b.count - a.count);
    
    console.log('All levels by hero count:');
    levelCounts.forEach(({ level, count }, index) => {
      const pct = ((count / totalHeroes) * 100).toFixed(1);
      console.log(`${(index + 1).toString().padStart(2)}. Level ${level.toString().padStart(3)}: ${count.toString().padStart(4)} heroes (${pct.padStart(4)}%)`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Main function
 */
async function main() {
  const walletAddress = process.argv[2];
  
  console.log(`🔗 Connecting to: ${GRAPHQL_ENDPOINT}\n`);
  
  // Validate wallet address if provided
  if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    console.error('❌ Invalid wallet address format. Use a valid Ethereum address (0x...)');
    process.exit(1);
  }
  
  try {
    const heroes = await getAllDragmaHeroes(walletAddress);
    displayStats(heroes, walletAddress);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run script
if (require.main === module) {
  main();
} 