#!/usr/bin/env node

/**
 * Script pour analyser les statistiques des héros révélés vs non révélés
 * Usage: node hero-revealed-stats.js [walletAddress]
 */

// Configuration
const GRAPHQL_ENDPOINT = "http://localhost:8080/v1/graphql";

/**
 * Effectue une requête GraphQL
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
 * Récupère les statistiques des héros révélés
 */
async function getHeroRevealedStats(walletAddress = null) {
  let whereClause = {};
  
  if (walletAddress) {
    whereClause.owner_id = { _eq: walletAddress.toLowerCase() };
  }

  const query = `
    query GetHeroRevealedStats($where: Hero_bool_exp!) {
      # Héros révélés
      revealed_heroes: Hero_aggregate(where: { _and: [{ revealed: { _eq: true } }, $where] }) {
        aggregate {
          count
        }
      }
      
      # Héros non révélés
      unrevealed_heroes: Hero_aggregate(where: { _and: [{ revealed: { _eq: false } }, $where] }) {
        aggregate {
          count
        }
      }
      
      # Total des héros
      total_heroes: Hero_aggregate(where: $where) {
        aggregate {
          count
        }
      }
      
      # Répartition par niveau des héros révélés
      revealed_by_level: Hero_aggregate(
        where: { _and: [{ revealed: { _eq: true } }, $where] }
      ) {
        nodes {
          level
        }
      }
      
      # Héros stakés actuellement (doivent tous être révélés)
      staked_heroes: Hero_aggregate(where: { _and: [{ staked: { _eq: true } }, $where] }) {
        aggregate {
          count
        }
      }
      
      # Héros révélés par type de staking
      revealed_staking_types: Hero_aggregate(
        where: { _and: [{ revealed: { _eq: true } }, { stakingType: { _is_null: false } }, $where] }
      ) {
        nodes {
          stakingType
        }
      }
    }
  `;

  try {
    const data = await makeGraphQLRequest(GRAPHQL_ENDPOINT, query, { where: whereClause });
    return data;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données:', error.message);
    throw error;
  }
}

/**
 * Analyse et affiche les statistiques
 */
async function analyzeHeroRevealedStats(walletAddress = null) {
  console.log('🔍 Analyse des héros révélés...\n');
  
  if (walletAddress) {
    console.log(`📊 Statistiques pour le wallet: ${walletAddress}\n`);
  } else {
    console.log('📊 Statistiques globales\n');
  }

  const stats = await getHeroRevealedStats(walletAddress);
  
  const revealedCount = stats.revealed_heroes.aggregate.count;
  const unrevealedCount = stats.unrevealed_heroes.aggregate.count;
  const totalCount = stats.total_heroes.aggregate.count;
  const stakedCount = stats.staked_heroes.aggregate.count;
  
  const revealedPercentage = totalCount > 0 ? ((revealedCount / totalCount) * 100).toFixed(2) : 0;
  
  console.log('='.repeat(60));
  console.log('📈 VUE D\'ENSEMBLE');
  console.log('='.repeat(60));
  console.log(`🦸 Total des héros: ${totalCount}`);
  console.log(`👁️  Héros révélés: ${revealedCount} (${revealedPercentage}%)`);
  console.log(`🔒 Héros non révélés: ${unrevealedCount} (${(100 - revealedPercentage).toFixed(2)}%)`);
  console.log(`⚡ Héros stakés actuellement: ${stakedCount}`);
  console.log('');
  
  // Analyse par niveau des héros révélés
  if (stats.revealed_by_level.nodes.length > 0) {
    const levelCounts = {};
    stats.revealed_by_level.nodes.forEach(hero => {
      levelCounts[hero.level] = (levelCounts[hero.level] || 0) + 1;
    });
    
    console.log('📊 HÉROS RÉVÉLÉS PAR NIVEAU');
    console.log('='.repeat(60));
    Object.entries(levelCounts)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([level, count]) => {
        console.log(`   Niveau ${level}: ${count} héros`);
      });
    console.log('');
  }
  
  // Analyse par type de staking
  if (stats.revealed_staking_types.nodes.length > 0) {
    const stakingTypeCounts = {};
    stats.revealed_staking_types.nodes.forEach(hero => {
      if (hero.stakingType) {
        stakingTypeCounts[hero.stakingType] = (stakingTypeCounts[hero.stakingType] || 0) + 1;
      }
    });
    
    console.log('🎯 HÉROS RÉVÉLÉS PAR TYPE DE STAKING');
    console.log('='.repeat(60));
    Object.entries(stakingTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([stakingType, count]) => {
        const displayName = stakingType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        console.log(`   ${displayName}: ${count} héros`);
      });
    console.log('');
  }
  
  // Recommandations
  console.log('💡 RECOMMANDATIONS');
  console.log('='.repeat(60));
  
  if (unrevealedCount > 0) {
    console.log(`🔒 ${unrevealedCount} héros ne sont pas encore révélés`);
    console.log('   Pour les révéler, stakez-les dans :');
    console.log('   • DragmaUnderlings (rewards passifs)');
    console.log('   • Fishing (Slime Bay, Shroom Grotto, Skeet Pier)');
    console.log('   • Ou transférez-les vers les contrats S1 (si applicable)');
    console.log('');
  }
  
  if (revealedCount > stakedCount) {
    const inactiveRevealed = revealedCount - stakedCount;
    console.log(`⚠️  ${inactiveRevealed} héros révélés ne sont pas stakés actuellement`);
    console.log('   Considérez les staker pour obtenir des rewards !');
    console.log('');
  }
  
  if (revealedPercentage < 50) {
    console.log('🎯 Taux de révélation faible - stakez plus de héros pour débloquer leur potentiel !');
  } else if (revealedPercentage >= 80) {
    console.log('🎉 Excellent taux de révélation - vos héros sont bien utilisés !');
  } else {
    console.log('👍 Bon taux de révélation - continuez à staker pour révéler plus de héros !');
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const walletAddress = process.argv[2];
    
    if (walletAddress && walletAddress.length !== 42) {
      console.error('❌ Adresse wallet invalide. Format attendu: 0x...');
      process.exit(1);
    }
    
    await analyzeHeroRevealedStats(walletAddress);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 