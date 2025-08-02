#!/usr/bin/env node

async function getRemixStats(options = {}) {
  const {
    user = null, // Filtre par utilisateur spécifique
    startTimestamp = null, // Timestamp de début (en secondes)
    endTimestamp = null, // Timestamp de fin (en secondes)
    remixType = null // 'NORMAL', 'LEGENDARY', 'ALL' ou null pour tous
  } = options;

  const url = "https://graph.onchainsuperheroes.xyz/v1/graphql";
  
  // Construction des filtres GraphQL
  let activityWhere = `eventType: { _eq: "REMIX" }, contract: { _eq: "WeaponRemixer" }`;
  let userStatsWhere = "";
  
  if (user) {
    activityWhere += `, user: { _eq: "${user}" }`;
    userStatsWhere = `id: { _eq: "${user}" }`;
  }
  
  if (startTimestamp) {
    activityWhere += `, timestamp: { _gte: "${startTimestamp}" }`;
  }
  
  if (endTimestamp) {
    activityWhere += `, timestamp: { _lte: "${endTimestamp}" }`;
  }
  
  const query = `
    query RemixStats {
      # Activités de remix
      activities: Activity(where: { ${activityWhere} }) {
        id
        timestamp
        user
        eventType
        details
        contract
      }
      
      # Stats utilisateur (si un user spécifique)
      ${user ? `userStats: RemixUserStats(where: { ${userStatsWhere} }) {
        id
        totalRemixes
        totalSpent
        remixesByNumWeapons
        spentByNumWeapons
        outcomesByTypeAndRarity
      }` : ''}
      
      # Stats globales
      globalStats: RemixGlobalStats(id: "global") {
        id
        totalRemixes
        totalSpent
        remixesByNumWeapons
        spentByNumWeapons
        outcomesByTypeAndRarity
      }
    }
  `;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      return;
    }
    
    const activities = data.data.activities || [];
    const userStats = data.data.userStats?.[0] || null;
    const globalStats = data.data.globalStats;
    
    // Analyser les activités de remix
    const remixActivities = activities.filter(activity => 
      activity.eventType === 'REMIX' && activity.contract === 'WeaponRemixer'
    );
    
    // Parser les détails des activités
    const remixDetails = remixActivities.map(activity => {
      try {
        const details = JSON.parse(activity.details);
        return {
          ...activity,
          parsedDetails: details
        };
      } catch (e) {
        return {
          ...activity,
          parsedDetails: {}
        };
      }
    });
    
    // Statistiques par type de remix
    const legendaryRemixes = remixDetails.filter(remix => 
      remix.parsedDetails.remixType === 'LEGENDARY' || 
      remix.parsedDetails.type === 'LEGENDARY'
    );
    
    const normalRemixes = remixDetails.filter(remix => 
      remix.parsedDetails.remixType === 'NORMAL' || 
      remix.parsedDetails.type === 'NORMAL'
    );
    
    // Affichage des résultats
    console.log('\n=== REMIX STATS ===');
    console.log(`Total Activities: ${remixActivities.length}`);
    console.log(`Legendary Remixes: ${legendaryRemixes.length}`);
    console.log(`Normal Remixes: ${normalRemixes.length}`);
    
    if (userStats) {
      console.log('\n=== USER STATS ===');
      console.log(`Total Remixes: ${userStats.totalRemixes}`);
      console.log(`Total Spent: ${userStats.totalSpent}`);
      console.log(`Remixes by weapon count: ${userStats.remixesByNumWeapons.join(', ')}`);
      console.log(`Spent by weapon count: ${userStats.spentByNumWeapons.join(', ')}`);
    }
    
    if (globalStats) {
      console.log('\n=== GLOBAL STATS ===');
      console.log(`Total Remixes: ${globalStats.totalRemixes}`);
      console.log(`Total Spent: ${globalStats.totalSpent}`);
      console.log(`Remixes by weapon count: ${globalStats.remixesByNumWeapons.join(', ')}`);
      console.log(`Spent by weapon count: ${globalStats.spentByNumWeapons.join(', ')}`);
    }
    
    // Détails des activités récentes (5 premiers)
    if (remixActivities.length > 0) {
      console.log('\n=== RECENT ACTIVITIES (first 5) ===');
      remixActivities
        .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
        .slice(0, 5)
        .forEach(activity => {
          const date = new Date(parseInt(activity.timestamp) * 1000);
          const details = JSON.parse(activity.details);
          console.log(`${activity.id}: ${details.remixType || details.type || 'UNKNOWN'} - ${date.toLocaleString()}`);
          console.log(`  Details: ${JSON.stringify(details)}`);
        });
    }
    
    return {
      totalActivities: remixActivities.length,
      legendaryRemixes: legendaryRemixes.length,
      normalRemixes: normalRemixes.length,
      userStats,
      globalStats
    };
    
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Fonction pour afficher l'aide
function showHelp() {
  console.log(`
Usage: node remixStats.js [options]

Options:
  --type <type>           Type de remix à analyser (all, normal, legendary)
  --user <address>        Adresse utilisateur spécifique
  --start <timestamp>     Timestamp de début (en secondes)
  --end <timestamp>       Timestamp de fin (en secondes)
  --days <number>         Nombre de jours à partir d'aujourd'hui
  --help                  Afficher cette aide

Examples:
  node remixStats.js --type all
  node remixStats.js --type legendary
  node remixStats.js --type normal --user 0x123...
  node remixStats.js --type all --days 7
  node remixStats.js --type legendary --start 1700000000 --end 1700086400
`);
}

// Fonction pour parser les arguments CLI
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
        
      case '--type':
        options.remixType = args[++i]?.toUpperCase();
        break;
        
      case '--user':
        options.user = args[++i];
        break;
        
      case '--start':
        options.startTimestamp = args[++i];
        break;
        
      case '--end':
        options.endTimestamp = args[++i];
        break;
        
      case '--days':
        const days = parseInt(args[++i]);
        if (!isNaN(days)) {
          const startTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
          options.startTimestamp = startTime.toString();
        }
        break;
        
      default:
        console.error(`Unknown option: ${arg}`);
        showHelp();
        process.exit(1);
    }
  }
  
  return options;
}

// Fonction principale CLI
async function main() {
  const options = parseArgs();
  
  // Validation des options
  if (options.remixType && !['ALL', 'NORMAL', 'LEGENDARY'].includes(options.remixType)) {
    console.error('Error: --type must be one of: all, normal, legendary');
    process.exit(1);
  }
  
  // Si aucun type n'est spécifié, utiliser 'ALL' par défaut
  if (!options.remixType) {
    options.remixType = 'ALL';
  }
  
  // Convertir 'ALL' en null pour la fonction
  if (options.remixType === 'ALL') {
    options.remixType = null;
  }
  
  console.log('🔍 Fetching remix statistics...');
  if (options.user) console.log(`👤 Filtering by user: ${options.user}`);
  if (options.startTimestamp) console.log(`📅 Start time: ${new Date(parseInt(options.startTimestamp) * 1000).toLocaleString()}`);
  if (options.endTimestamp) console.log(`📅 End time: ${new Date(parseInt(options.endTimestamp) * 1000).toLocaleString()}`);
  console.log(`🎯 Remix type: ${options.remixType || 'ALL'}`);
  
  await getRemixStats(options);
}

// Exécution si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { getRemixStats }; 