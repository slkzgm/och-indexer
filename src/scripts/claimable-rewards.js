#!/usr/bin/env node

/**
 * Script standalone pour calculer les rewards claimables OCH
 * Usage: node claimable-rewards.js <walletAddress>
 */

// Configuration
const GRAPHQL_ENDPOINT = "http://localhost:8080/v1/graphql"; // Change cette URL selon ton setup
const WEI_SCALE = BigInt("1000000000000000000"); // 1e18

// Query GraphQL pour récupérer les données du player
const PLAYER_QUERY = `
  query GetPlayerClaimable($playerId: String!) {
    Player_by_pk(id: $playerId) {
      id
      heroes(where: { staked: { _eq: true } }) {
        id
        effectiveHeroPerDay
        staked
        lastClaimTimestamp
        stakedTimestamp
      }
    }
  }
`;

/**
 * Calcule le montant claimable pour un héro
 */
function calculateHeroClaimable(hero, currentTimestamp) {
  if (!hero.staked) return BigInt(0);

  // Détermine le timestamp de référence
  let referenceTimestamp;
  
  // Si lastClaimTimestamp existe et > 0, on l'utilise, sinon on prend stakedTimestamp
  if (hero.lastClaimTimestamp && BigInt(hero.lastClaimTimestamp) > 0n) {
    referenceTimestamp = BigInt(hero.lastClaimTimestamp);
  } else if (hero.stakedTimestamp && BigInt(hero.stakedTimestamp) > 0n) {
    referenceTimestamp = BigInt(hero.stakedTimestamp);
  } else {
    return BigInt(0);
  }

  // Calcule le temps écoulé en secondes
  const timeElapsed = currentTimestamp - referenceTimestamp;
  if (timeElapsed <= 0n) return BigInt(0);

  // Calcul proportionnel SANS perte de précision
  // On fait (secondes écoulées × yield par jour) / secondes par jour
  // Au lieu de (secondes écoulées) × (yield par jour / secondes par jour)
  const effectivePerDay = BigInt(hero.effectiveHeroPerDay);
  
  return (timeElapsed * effectivePerDay) / 86400n;
}

/**
 * Formate un montant wei en HERO tokens
 */
function formatTokens(weiAmount) {
  const tokens = Number(weiAmount) / Number(WEI_SCALE);
  return tokens.toFixed(4);
}

/**
 * Récupère les données du player via GraphQL
 */
async function fetchPlayerData(walletAddress) {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: PLAYER_QUERY,
        variables: { playerId: walletAddress.toLowerCase() }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL Error: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return result.data?.Player_by_pk;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données:', error.message);
    process.exit(1);
  }
}

/**
 * Calcule et affiche les rewards claimables
 */
async function calculateAndDisplayRewards(walletAddress) {
  console.log('🔍 Récupération des données...');
  
  const playerData = await fetchPlayerData(walletAddress);
  
  if (!playerData) {
    console.log(`❌ Player ${walletAddress} non trouvé`);
    return;
  }

  const stakedHeroes = playerData.heroes || [];
  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
  
  console.log('\n' + '='.repeat(60));
  console.log('🎮 REWARDS CLAIMABLES OCH 🎮');
  console.log('='.repeat(60));
  console.log(`👤 Player: ${walletAddress}`);
  console.log(`🦸 Héros stakés: ${stakedHeroes.length}`);
  console.log(`⏰ Calculé le: ${new Date().toLocaleString()}`);

  if (stakedHeroes.length === 0) {
    console.log('\n📝 Aucun héro staké - Pas de rewards à claim');
    return;
  }

  let totalClaimable = BigInt(0);
  const heroDetails = [];

  console.log('\n📊 DÉTAIL PAR HÉRO:');
  console.log('-'.repeat(50));

  for (const hero of stakedHeroes) {
    const claimable = calculateHeroClaimable(hero, currentTimestamp);
    
    // Calcule les jours écoulés pour l'affichage
    let daysElapsed = BigInt(0);
    let refTimestamp = BigInt(0);
    let refType = "none";
    
    if (hero.staked) {
      if (hero.lastClaimTimestamp && BigInt(hero.lastClaimTimestamp) > 0n) {
        refTimestamp = BigInt(hero.lastClaimTimestamp);
        refType = "lastClaim";
      } else if (hero.stakedTimestamp && BigInt(hero.stakedTimestamp) > 0n) {
        refTimestamp = BigInt(hero.stakedTimestamp);
        refType = "staked";
      }
      
      if (refTimestamp > 0n) {
        const elapsed = currentTimestamp - refTimestamp;
        daysElapsed = elapsed > 0n ? elapsed / 86400n : BigInt(0);
      }
    }

    heroDetails.push({
      id: hero.id,
      claimable,
      daysElapsed,
      effectivePerDay: BigInt(hero.effectiveHeroPerDay)
    });

    totalClaimable += claimable;

    console.log(`🦸 Héro ${hero.id}:`);
    console.log(`   📅 Dernière ref: ${new Date(Number(refTimestamp) * 1000).toLocaleString()} (${refType})`);
    console.log(`   ⏱️  Temps écoulé: ${Number(currentTimestamp - refTimestamp)}s`);
    console.log(`   💎 Rate: ${formatTokens(BigInt(hero.effectiveHeroPerDay))} HERO/jour`);
    console.log(`   💰 Claimable: ${formatTokens(claimable)} HERO`);
    
    if (claimable === 0n) {
      console.log(`   ⚠️  Aucun reward (pas assez de temps écoulé)`);
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`💰 TOTAL CLAIMABLE: ${formatTokens(totalClaimable)} HERO`);
  console.log('='.repeat(60));

  if (totalClaimable > 0n) {
    console.log('\n💡 TIP: Vous pouvez claim vos rewards maintenant !');
  } else {
    console.log('\nℹ️  Les rewards s\'accumulent par heure. Revenez plus tard !');
  }
}

/**
 * Main function
 */
async function main() {
  const walletAddress = process.argv[2];
  
  if (!walletAddress) {
    console.log('Usage: node claimable-rewards.js <walletAddress>');
    console.log('Exemple: node claimable-rewards.js 0x1234567890123456789012345678901234567890');
    process.exit(1);
  }

  // Validation basique de l'adresse
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    console.log('❌ Format d\'adresse invalide. Utilisez une adresse Ethereum valide.');
    process.exit(1);
  }

  await calculateAndDisplayRewards(walletAddress);
}

// Exécute le script
main().catch(error => {
  console.error('💥 Erreur fatale:', error.message);
  process.exit(1);
}); 