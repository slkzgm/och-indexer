async function getLegendaryRemixStats() {
  const url = "https://graph.onchainsuperheroes.xyz/v1/graphql";
  
  const query = `
    query LegendaryRemixStats {
      legendaryRequests: WeaponRemixer_LegendaryMixRequested {
        id
        requestId
      }
      
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
    
    const total = data.data.legendaryRequests.length;
    const success = data.data.mythicWeapons.length;
    const fail = total - success;
    
    const successRate = total > 0 ? ((success / total) * 100).toFixed(2) : 0;
    const failRate = total > 0 ? ((fail / total) * 100).toFixed(2) : 0;
    
    // Stats par utilisateur
    const userStats = {};
    
    // Compter les requests par utilisateur
    data.data.weaponRequests.forEach(req => {
      if (!userStats[req.requester]) {
        userStats[req.requester] = {
          total: 0,
          success: 0,
          fail: 0
        };
      }
      userStats[req.requester].total++;
    });
    
    // Créer un mapping requestId -> user 
    // Le requestId des legendaryRequests correspond à l'ID des weaponRequests
    const requestIdToUser = {};
    data.data.legendaryRequests.forEach(req => {
      // Trouver le WeaponRequest correspondant par son ID
      const weaponRequest = data.data.weaponRequests.find(wr => wr.id === req.requestId.toString());
      if (weaponRequest) {
        requestIdToUser[req.requestId] = weaponRequest.requester;
      }
    });
    
    console.log('\nRequestID to User mapping (first 5):');
    Object.entries(requestIdToUser).slice(0, 5).forEach(([requestId, user]) => {
      console.log(`  RequestID: ${requestId} -> User: ${user}`);
    });
    
    // Compter les succès par utilisateur en utilisant requestId
    let matchedWeapons = 0;
    data.data.mythicWeapons.forEach(weapon => {
      const userId = requestIdToUser[weapon.requestId];
      if (userId && userStats[userId]) {
        userStats[userId].success++;
        matchedWeapons++;
      }
    });
    
    console.log(`\nMatched weapons: ${matchedWeapons} out of ${data.data.mythicWeapons.length}`);
    
    // Calculer les échecs
    Object.keys(userStats).forEach(userId => {
      userStats[userId].fail = userStats[userId].total - userStats[userId].success;
    });
    
    console.log('\n=== LEGENDARY REMIX STATS ===');
    console.log(`Total: ${total}`);
    console.log(`Success: ${success} (${successRate}%)`);
    console.log(`Fail: ${fail} (${failRate}%)`);
    
    console.log('\n=== STATS BY USER ===');
    Object.entries(userStats)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([userId, userStat]) => {
        const userSuccessRate = userStat.total > 0 ? ((userStat.success / userStat.total) * 100).toFixed(2) : 0;
        console.log(`${userId}: ${userStat.total} total, ${userStat.success} success (${userSuccessRate}%), ${userStat.fail} fail`);
      });
    
    return {
      total,
      success,
      fail,
      successRate,
      failRate,
      userStats
    };
    
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Utilisation
getLegendaryRemixStats();