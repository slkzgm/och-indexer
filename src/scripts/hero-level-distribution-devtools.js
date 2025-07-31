/**
 * Browser DevTools version of hero level distribution analyzer
 * Copy and paste this entire script into your browser's DevTools console
 * Usage: 
 * - analyzeHeroLevelDistribution() // Global distribution
 * - analyzeHeroLevelDistribution('0x1234...') // For specific wallet
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
 * Retrieves hero distribution by level
 */
async function getHeroLevelDistribution(walletAddress = null) {
  let whereClause = {};
  
  if (walletAddress) {
    whereClause.owner_id = { _eq: walletAddress.toLowerCase() };
  }

  const query = `
    query GetHeroLevelDistribution($where: Hero_bool_exp!) {
      # Get all heroes with their levels
      Hero(where: $where) {
        id
        level
      }
    }
  `;

  try {
    const data = await makeGraphQLRequest(GRAPHQL_ENDPOINT, query, { where: whereClause });
    return data;
  } catch (error) {
    console.error('❌ Error retrieving data:', error.message);
    throw error;
  }
}

/**
 * Analyzes and displays the distribution by level
 */
async function analyzeHeroLevelDistribution(walletAddress = null) {
  console.log('🔍 Analyzing hero distribution by level...\n');
  
  if (walletAddress) {
    console.log(`📊 Distribution for wallet: ${walletAddress}\n`);
  } else {
    console.log('📊 Global distribution\n');
  }

  const data = await getHeroLevelDistribution(walletAddress);
  
  const heroes = data.Hero;
  const totalHeroes = heroes.length;
  
  // Calculate distribution by level
  const levelDistribution = {};
  heroes.forEach(hero => {
    levelDistribution[hero.level] = (levelDistribution[hero.level] || 0) + 1;
  });
  
  console.log('='.repeat(80));
  console.log('📊 HERO DISTRIBUTION BY LEVEL');
  console.log('='.repeat(80));
  console.log(`🦸 Total heroes: ${totalHeroes}\n`);
  
  // Display complete distribution
  const sortedLevels = Object.keys(levelDistribution).sort((a, b) => parseInt(a) - parseInt(b));
  
  console.log('Level | Count | Percentage | Cumulative | Cumul %');
  console.log('------|-------|-----------|------------|---------');
  
  let cumulativeCount = 0;
  sortedLevels.forEach(level => {
    const count = levelDistribution[level];
    const percentage = ((count / totalHeroes) * 100).toFixed(1);
    cumulativeCount += count;
    const cumulativePercentage = ((cumulativeCount / totalHeroes) * 100).toFixed(1);
    
    console.log(`   ${level.toString().padStart(2)}  | ${count.toString().padStart(5)} | ${percentage.toString().padStart(8)}% | ${cumulativeCount.toString().padStart(10)} | ${cumulativePercentage.toString().padStart(7)}%`);
  });
  
  console.log('');
  
  // Most popular levels
  const mostPopularLevels = Object.entries(levelDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  console.log('🏆 MOST POPULAR LEVELS');
  console.log('='.repeat(80));
  mostPopularLevels.forEach(([level, count], index) => {
    const percentage = ((count / totalHeroes) * 100).toFixed(1);
    console.log(`${index + 1}. Level ${level}: ${count} heroes (${percentage}%)`);
  });
  console.log('');
  
  // Return data for further analysis
  return {
    totalHeroes,
    levelDistribution,
    sortedLevels,
    mostPopularLevels
  };
}

/**
 * Quick analysis function for specific wallet
 */
async function analyzeWallet(walletAddress) {
  if (!walletAddress || walletAddress.length !== 42) {
    console.error('❌ Invalid wallet address. Expected format: 0x...');
    return;
  }
  
  return await analyzeHeroLevelDistribution(walletAddress);
}

/**
 * Get raw data for custom analysis
 */
async function getHeroData(walletAddress = null) {
  const data = await getHeroLevelDistribution(walletAddress);
  return data.Hero;
}

// Make functions available globally
window.analyzeHeroLevelDistribution = analyzeHeroLevelDistribution;
window.analyzeWallet = analyzeWallet;
window.getHeroData = getHeroData;

console.log('🚀 Hero Level Distribution Analyzer loaded!');
console.log('Available functions:');
console.log('- analyzeHeroLevelDistribution() // Global distribution');
console.log('- analyzeHeroLevelDistribution("0x1234...") // Specific wallet');
console.log('- analyzeWallet("0x1234...") // Quick wallet analysis');
console.log('- getHeroData() // Get raw hero data');
console.log(''); 