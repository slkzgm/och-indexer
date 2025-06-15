#!/usr/bin/env node

/**
 * Script simplifié pour récupérer le montant total de tous les événements WeaponRequested 
 * de HeroWeaponMachine entre un block de début et un block de fin
 * 
 * Usage: node src/scripts/get-hero-weapon-requests-total-simple.js <startBlock> <endBlock> [endpoint]
 */

const https = require('https');
const http = require('http');

// Configuration par défaut
const DEFAULT_ENDPOINT = 'http://localhost:8080/v1/graphql';

/**
 * Fait une requête GraphQL
 */
async function makeGraphQLRequest(endpoint, query, variables = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify({
      query,
      variables
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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
 * Extrait le numéro de bloc depuis l'ID de l'événement
 * Format ID: "chainId_blockNumber_logIndex"
 */
function extractBlockFromId(id) {
  const parts = id.split('_');
  if (parts.length >= 2) {
    return parseInt(parts[1]);
  }
  return null;
}

/**
 * Récupère tous les événements WeaponRequested avec pagination
 */
async function getAllWeaponRequests(endpoint, startBlock, endBlock) {
  const allEvents = [];
  let hasNextPage = true;
  let offset = 0;
  const limit = 1000;

  console.log(`🔍 Récupération de tous les événements WeaponRequested...`);

  // D'abord, récupérer le total pour info
  const aggregateQuery = `
    query GetTotal {
      HeroWeaponMachine_WeaponRequested_aggregate {
        aggregate {
          count
          sum {
            amount
            qty
          }
        }
      }
    }
  `;

  try {
    const totalData = await makeGraphQLRequest(endpoint, aggregateQuery);
    const totalCount = totalData.HeroWeaponMachine_WeaponRequested_aggregate?.aggregate?.count || 0;
    const totalAmount = totalData.HeroWeaponMachine_WeaponRequested_aggregate?.aggregate?.sum?.amount || "0";
    
    console.log(`📊 Total d'événements dans la base: ${totalCount.toLocaleString()}`);
    console.log(`💰 Montant total dans la base: ${totalAmount} wei`);
    console.log(`🔄 Filtrage par blocs ${startBlock} → ${endBlock}...`);
  } catch (error) {
    console.warn('⚠️  Impossible de récupérer les totaux:', error.message);
  }

  while (hasNextPage) {
    const query = `
      query GetHeroWeaponRequests($limit: Int!, $offset: Int!) {
        HeroWeaponMachine_WeaponRequested(
          limit: $limit
          offset: $offset
          order_by: { id: asc }
        ) {
          id
          user
          slot
          qty  
          amount
          requestId
        }
      }
    `;

    const variables = {
      limit: limit,
      offset: offset
    };

    try {
      console.log(`📄 Récupération page ${Math.floor(offset / limit) + 1}... (${offset + 1}-${offset + limit})`);
      const data = await makeGraphQLRequest(endpoint, query, variables);
      
      const events = data.HeroWeaponMachine_WeaponRequested || [];
      
      // Filtrer par bloc côté client
      const filteredEvents = events.filter(event => {
        const blockNumber = extractBlockFromId(event.id);
        return blockNumber !== null && blockNumber >= startBlock && blockNumber <= endBlock;
      });

      allEvents.push(...filteredEvents);

      console.log(`   └─ ${events.length} événements récupérés, ${filteredEvents.length} dans la plage de blocs`);

      if (events.length < limit) {
        hasNextPage = false;
      } else {
        offset += limit;
      }

    } catch (error) {
      console.error('❌ Erreur lors de la requête GraphQL:', error.message);
      throw error;
    }
  }

  console.log(`✅ Filtrage terminé: ${allEvents.length} événements dans la plage de blocs ${startBlock}-${endBlock}`);
  return allEvents;
}

/**
 * Calcule le montant total et affiche les statistiques
 */
function calculateStats(events, startBlock, endBlock) {
  if (events.length === 0) {
    console.log(`ℹ️  Aucun événement trouvé dans la plage de blocs ${startBlock}-${endBlock}.`);
    return;
  }

  let totalAmount = BigInt(0);
  let totalQty = 0;
  const users = new Set();
  const slots = new Map();
  const blockNumbers = [];

  console.log('\n📈 Analyse des événements...');

  events.forEach(event => {
    const amount = BigInt(event.amount);
    const qty = parseInt(event.qty);
    const blockNumber = extractBlockFromId(event.id);
    
    totalAmount += amount;
    totalQty += qty;
    users.add(event.user.toLowerCase());
    
    if (blockNumber) {
      blockNumbers.push(blockNumber);
    }
    
    const slot = event.slot;
    slots.set(slot, (slots.get(slot) || 0) + qty);
  });

  // Trier les blocs pour avoir min/max
  blockNumbers.sort((a, b) => a - b);

  // Convertir en ETH (supposant 18 décimales)
  const totalAmountEth = Number(totalAmount) / Math.pow(10, 18);

  console.log('\n' + '='.repeat(70));
  console.log('📊 RÉSULTATS - HeroWeaponMachine WeaponRequested');
  console.log('='.repeat(70));
  console.log(`📦 Plage de blocs demandée: ${startBlock.toLocaleString()} → ${endBlock.toLocaleString()}`);
  if (blockNumbers.length > 0) {
    console.log(`📦 Plage de blocs réelle: ${blockNumbers[0].toLocaleString()} → ${blockNumbers[blockNumbers.length - 1].toLocaleString()}`);
  }
  console.log(`💰 Montant total: ${totalAmount.toString()} wei`);
  console.log(`💰 Montant total: ${totalAmountEth.toLocaleString()} ETH`);
  console.log(`🔢 Nombre d'événements: ${events.length.toLocaleString()}`);
  console.log(`⚔️  Armes totales demandées: ${totalQty.toLocaleString()}`);
  console.log(`👥 Utilisateurs uniques: ${users.size.toLocaleString()}`);
  
  // Moyenne par événement
  if (events.length > 0) {
    const avgAmount = Number(totalAmount / BigInt(events.length)) / Math.pow(10, 18);
    const avgQty = totalQty / events.length;
    console.log(`📊 Montant moyen par événement: ${avgAmount.toLocaleString()} ETH`);
    console.log(`📊 Quantité moyenne par événement: ${avgQty.toFixed(2)} armes`);
  }

  // Répartition par slot
  if (slots.size > 0) {
    console.log('\n🎰 Répartition par slot:');
    Array.from(slots.entries())
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([slot, count]) => {
        console.log(`   Slot ${slot}: ${count.toLocaleString()} armes`);
      });
  }

  console.log('='.repeat(70));

  return {
    totalAmount: totalAmount.toString(),
    totalAmountEth,
    eventCount: events.length,
    totalQty,
    uniqueUsers: users.size,
    requestedBlockRange: `${startBlock}-${endBlock}`,
    actualBlockRange: blockNumbers.length > 0 ? `${blockNumbers[0]}-${blockNumbers[blockNumbers.length - 1]}` : 'N/A',
    firstEventId: events[0]?.id,
    lastEventId: events[events.length - 1]?.id
  };
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node src/scripts/get-hero-weapon-requests-total-simple.js <startBlock> <endBlock> [endpoint]');
    console.log('');
    console.log('Exemples:');
    console.log('  node src/scripts/get-hero-weapon-requests-total-simple.js 11805450 11888770');
    console.log('  node src/scripts/get-hero-weapon-requests-total-simple.js 11805450 11888770 http://localhost:8080/v1/graphql');
    console.log('');
    console.log('Note: Ce script récupère TOUS les événements puis filtre côté client par bloc.');
    process.exit(1);
  }

  const startBlock = parseInt(args[0]);
  const endBlock = parseInt(args[1]);
  const endpoint = args[2] || DEFAULT_ENDPOINT;

  if (isNaN(startBlock) || isNaN(endBlock)) {
    console.error('❌ Les numéros de blocs doivent être des nombres valides');
    process.exit(1);
  }

  if (startBlock > endBlock) {
    console.error('❌ Le bloc de début doit être inférieur ou égal au bloc de fin');
    process.exit(1);
  }

  console.log('🚀 Démarrage du script...');
  console.log(`📡 Endpoint: ${endpoint}`);
  console.log(`📦 Plage de blocs: ${startBlock.toLocaleString()} → ${endBlock.toLocaleString()}`);

  try {
    const events = await getAllWeaponRequests(endpoint, startBlock, endBlock);
    const stats = calculateStats(events, startBlock, endBlock);
    
    // Sauvegarder dans un fichier JSON
    if (events.length > 0) {
      const fs = require('fs');
      const outputFile = `hero-weapon-requests-${startBlock}-${endBlock}.json`;
      fs.writeFileSync(outputFile, JSON.stringify({
        metadata: {
          startBlock,
          endBlock,
          timestamp: new Date().toISOString(),
          stats
        },
        events
      }, null, 2));
      console.log(`💾 Données sauvegardées dans: ${outputFile}`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Lancer le script si appelé directement
if (require.main === module) {
  main();
}

module.exports = { getAllWeaponRequests, calculateStats, extractBlockFromId }; 