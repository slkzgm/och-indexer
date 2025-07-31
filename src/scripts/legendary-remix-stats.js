#!/usr/bin/env node

/**
 * Script to retrieve and analyze legendary remix statistics
 * Usage: node legendary-remix-stats.js [walletAddress]
 */

// Configuration
const GRAPHQL_ENDPOINT = "https://graph.onchainsuperheroes.xyz/v1/graphql";

/**
 * Performs a GraphQL request
 */
async function makeGraphQLRequest(endpoint, query, variables = {}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL error: ${result.errors.map(e => e.message).join(', ')}`);
  }

  return result.data;
}

/**
 * Retrieves legendary remix statistics
 */
async function getLegendaryRemixStats(walletAddress = null) {
  const query = `
    query GetLegendaryRemixStats {
      # Legendary remix requests
      legendaryRequests: WeaponRemixer_LegendaryMixRequested {
        id
        requestId
      }
      
      # Mythic weapons created from legendary remixes
      mythicWeapons: Weapon(
        where: { 
          source: { _eq: "REMIXER" }, 
          rarity: { _eq: 6 },
          sourceRemixType: { _eq: "LEGENDARY" }
        }
      ) {
        id
        requestId
        rarity
        owner_id
      }
      
      # Weapon requests for legendary remixes
      weaponRequests: WeaponRequest(
        where: { 
          source: { _eq: "REMIXER" }, 
          remixType: { _eq: "LEGENDARY" }
        }
      ) {
        id
        requester
        completed
        generatedWeapons
        expectedWeapons
        remixedWeaponIds
        remixRarity
        remixType
        timestamp
      }
      
      # Global remix stats
      remixGlobalStats {
        id
        totalRemixes
        remixesByNumWeapons
        totalSpent
        spentByNumWeapons
        lastUpdated
      }
    }
  `;

  try {
    const data = await makeGraphQLRequest(GRAPHQL_ENDPOINT, query);
    return data;
  } catch (error) {
    console.error('❌ Error retrieving data:', error.message);
    throw error;
  }
}

/**
 * Analyzes and displays legendary remix statistics
 */
async function analyzeLegendaryRemixStats(walletAddress = null) {
  console.log('🔍 Analyzing legendary remix statistics...\n');
  
  if (walletAddress) {
    console.log(`📊 Statistics for wallet: ${walletAddress}\n`);
  } else {
    console.log('📊 Global legendary remix statistics\n');
  }

  const data = await getLegendaryRemixStats(walletAddress);
  
  // Extract data
  const legendaryRequests = data.legendaryRequests;
  const mythicWeapons = data.mythicWeapons;
  let weaponRequests = data.weaponRequests;
  const globalStats = data.remixGlobalStats;
  
  // Filter by wallet if specified
  if (walletAddress) {
    weaponRequests = weaponRequests.filter(req => 
      req.requester.toLowerCase() === walletAddress.toLowerCase()
    );
  }
  
  // Calculate basic stats
  const totalRequests = legendaryRequests.length;
  const totalSuccess = mythicWeapons.length;
  const totalFail = totalRequests - totalSuccess;
  const successRate = totalRequests > 0 ? ((totalSuccess / totalRequests) * 100).toFixed(2) : 0;
  const failRate = totalRequests > 0 ? ((totalFail / totalRequests) * 100).toFixed(2) : 0;
  
  // Calculate costs (remixCost not available in API)
  const totalCost = BigInt(0);
  const averageCost = BigInt(0);
  
  // User statistics
  const userStats = {};
  
  // Count requests by user
  weaponRequests.forEach(req => {
    if (!userStats[req.requester]) {
          userStats[req.requester] = {
      total: 0,
      success: 0,
      fail: 0,
      totalCost: BigInt(0),
      weaponsConsumed: 0
    };
  }
  userStats[req.requester].total++;

  userStats[req.requester].weaponsConsumed += req.remixedWeaponIds ? req.remixedWeaponIds.length : 0;
  });
  
  // Create mapping requestId -> user
  const requestIdToUser = {};
  weaponRequests.forEach(req => {
    requestIdToUser[req.id] = req.requester;
  });
  
  // Count successes by user
  let matchedWeapons = 0;
  mythicWeapons.forEach(weapon => {
    const userId = requestIdToUser[weapon.requestId];
    if (userId && userStats[userId]) {
      userStats[userId].success++;
      matchedWeapons++;
    }
  });
  
  // Calculate failures
  Object.keys(userStats).forEach(userId => {
    userStats[userId].fail = userStats[userId].total - userStats[userId].success;
  });
  
  // Display results
  console.log('='.repeat(80));
  console.log('🏆 LEGENDARY REMIX STATISTICS');
  console.log('='.repeat(80));
  
  console.log(`📊 Total Requests: ${totalRequests}`);
  console.log(`✅ Successful: ${totalSuccess} (${successRate}%)`);
  console.log(`❌ Failed: ${totalFail} (${failRate}%)`);
  console.log(`💰 Total Cost: N/A (cost data not available)`);
  console.log(`💸 Average Cost: N/A (cost data not available)`);
  console.log(`🎯 Matched Weapons: ${matchedWeapons}/${mythicWeapons.length}`);
  
  // Global stats comparison
  if (globalStats && globalStats.length > 0) {
    const global = globalStats[0];
    console.log(`\n🌍 Global Remix Stats:`);
    console.log(`   Total Remixes: ${global.totalRemixes}`);
    console.log(`   Total Spent: ${(BigInt(global.totalSpent) / BigInt(1e18)).toLocaleString()} OCH`);
    console.log(`   Legendary % of Total: ${global.totalRemixes > 0 ? ((totalRequests / global.totalRemixes) * 100).toFixed(2) : 0}%`);
  }
  
  // User breakdown
  if (Object.keys(userStats).length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('👥 USER BREAKDOWN');
    console.log('='.repeat(80));
    
    const sortedUsers = Object.entries(userStats)
      .sort((a, b) => b[1].total - a[1].total);
    
    console.log('Wallet | Requests | Success | Fail | Success% | Weapons Used');
    console.log('-------|----------|---------|------|----------|-------------');
    
    sortedUsers.forEach(([userId, stats]) => {
      const userSuccessRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(2) : 0;
      
      console.log(
        `${userId.slice(0, 8)}... | ` +
        `${stats.total.toString().padStart(8)} | ` +
        `${stats.success.toString().padStart(7)} | ` +
        `${stats.fail.toString().padStart(4)} | ` +
        `${userSuccessRate.padStart(8)}% | ` +
        `${stats.weaponsConsumed.toString().padStart(12)}`
      );
    });
  }
  
  // Recent activity
  if (weaponRequests.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('🕒 RECENT LEGENDARY REMIX ACTIVITY');
    console.log('='.repeat(80));
    
    const recentRequests = weaponRequests.slice(0, 10);
    
    console.log('Wallet | Status | Weapons Used');
    console.log('-------|--------|-------------');
    
    recentRequests.forEach(req => {
      const wallet = req.requester.slice(0, 8) + '...';
      const status = req.completed ? '✅' : '⏳';
      const weaponsUsed = req.remixedWeaponIds ? req.remixedWeaponIds.length : 0;
      
      console.log(`${wallet} | ${status} | ${weaponsUsed}`);
    });
  }
  
  return {
    totalRequests,
    totalSuccess,
    totalFail,
    successRate,
    failRate,
    totalCost,
    averageCost,
    userStats,
    matchedWeapons
  };
}

/**
 * Main function
 */
async function main() {
  try {
    const walletAddress = process.argv[2];
    await analyzeLegendaryRemixStats(walletAddress);
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  getLegendaryRemixStats,
  analyzeLegendaryRemixStats
}; 