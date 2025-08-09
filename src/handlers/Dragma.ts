import {
  Dragma,
} from "generated";
import { getOrCreatePlayer } from "../helpers/entities";
import { updateWeaponAndHeroStats } from "../helpers/entities";
import { updatePlayerCounts } from "../helpers/player";
import { getOrCreateDragmaGlobalStats, getOrCreateDragmaUserStats } from "../helpers/stats";
import { createActivity } from "../helpers/activity";
import { updatePlayerTotalSpent } from "../helpers/player";
import { updateRewardsPerZone } from "../helpers/dragma";
import { calculateDragmaUnstakeAvailable, getDragmaStakingType, getDragmaZoneFromStakingType } from "../helpers/calculations";
import { updateItemsBalance, updateItemsBalancesBatch } from "../helpers/items";
import { ensureHeroRevealed } from "../helpers/hero";

/**
 * Handler pour Dragma.Staked
 * Stake un héro dans une zone de Dragma
 */
Dragma.Staked.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, entryFee, attackZone } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Parallélisation optimisée
    let stakedHero = {
      ...existingHero,
      staked: true,
      stakingType: getDragmaStakingType(attackZone),
      stakedTimestamp: timestamp,
      unstakeAvailableTimestamp: calculateDragmaUnstakeAvailable(timestamp), // 12h cooldown pour Dragma
      lastClaimTimestamp: 0n,
    };
    // Centralize reveal logic without extra write
    stakedHero = await ensureHeroRevealed(context, { hero: stakedHero, user: owner, timestamp, contract: 'Dragma', stakingType: getDragmaStakingType(attackZone), persist: false });
    await Promise.all([
      // Stocke l'événement brut
      context.Dragma_Staked.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        entryFee,
        attackZone,
      }),
      // Met à jour le héro : staking activé
      context.Hero.set(stakedHero),
      (async () => {
        if (!existingHero.staked) {
          const global = await getOrCreateDragmaGlobalStats(context);
          // Current active staked (alive)
          global.totalHeroes += 1;
          global.totalHeroesPerZone[Number(attackZone)] += 1;
          global.currentActiveStaked += 1;
          global.currentActiveStakedPerZone[Number(attackZone)] += 1;
          // Totals
          global.totalStakes += 1;
          global.heroesByLevel[existingHero.level] += 1;
          // Keep current totals by level in sync (active + dead)
          if (global.currentTotalByLevel) {
            global.currentTotalByLevel[existingHero.level] += 1;
          }
          global.heroesByLevelPerZone[Number(attackZone)][existingHero.level] += 1;
          // Per zone/level counters
          global.stakesByLevelPerZone[Number(attackZone)][existingHero.level] += 1;
          global.currentActiveByLevelPerZone[Number(attackZone)][existingHero.level] += 1;
          global.totalFeesPerZone[Number(attackZone)] += entryFee;
          global.lastUpdated = timestamp;
          context.DragmaGlobalStats.set(global);

          const userStats = await getOrCreateDragmaUserStats(context, owner.toLowerCase());
          userStats.totalHeroes += 1;
          userStats.heroesPerZone[Number(attackZone)] += 1;
          userStats.currentActiveStaked += 1;
          userStats.currentActiveStakedPerZone[Number(attackZone)] += 1;
          userStats.totalStakes += 1;
           userStats.heroesByLevel[existingHero.level] += 1;
           if (userStats.currentTotalByLevel) {
             userStats.currentTotalByLevel[existingHero.level] += 1;
           }
          userStats.heroesByLevelPerZone[Number(attackZone)][existingHero.level] += 1;
          userStats.stakesByLevelPerZone[Number(attackZone)][existingHero.level] += 1;
          userStats.currentActiveByLevelPerZone[Number(attackZone)][existingHero.level] += 1;
          userStats.totalFees += entryFee;
          userStats.feesPerZone[Number(attackZone)] += entryFee;
          userStats.totalSessionsPerZone[Number(attackZone)] += 1;
          context.DragmaUserStats.set(userStats);
          
          // Met à jour le totalSpent du joueur avec les fees de staking
          await updatePlayerTotalSpent(context, owner, entryFee);
        }
        await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, timestamp, owner, 'DRAGMA_STAKE', {heroId: heroId.toString(), entryFee: entryFee.toString(), zone: getDragmaStakingType(attackZone)}, existingHero.id, 'Dragma', getDragmaStakingType(attackZone));
        await ensureHeroRevealed(context, { hero: stakedHero, user: owner, timestamp, contract: 'Dragma', stakingType: getDragmaStakingType(attackZone), persist: false });
      })()
    ]);
    if (!existingHero.staked) {
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: 1 });
    }
    const updatedHeroWithCounts = {
      ...stakedHero,
      totalStakes: stakedHero.totalStakes + 1,
    };
    context.Hero.set(updatedHeroWithCounts);
  },
});

/**
 * Handler pour Dragma.UnstakeRequested
 * Demande d'unstake un héro
 */
Dragma.UnstakeRequested.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, requestId } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Stocke l'événement brut
    await context.Dragma_UnstakeRequested.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner,
      heroId,
      requestId,
    });

    await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, timestamp, owner, 'DRAGMA_UNSTAKE_REQUEST', {heroId: heroId.toString(), requestId: requestId.toString()}, existingHero.id, 'Dragma', existingHero.stakingType);
  },
});

/**
 * Handler pour Dragma.Unstaked
 * Unstake un héro avec rewards
 */
Dragma.Unstaked.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, requestId, gachaTokenId, weaponShardQty, primaryRewards, secondaryRewards, tertiaryRewards } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    // Calcule les rewards totaux
    const totalRewards = BigInt(primaryRewards.length + secondaryRewards.length + tertiaryRewards.length);
    const gachaReward = gachaTokenId > 0n ? 1n : 0n;
    const totalRewardsWithGacha = totalRewards + gachaReward;

    // Parallélisation optimisée
    const unstakedHero = {
      ...existingHero,
      staked: false,
      stakingType: undefined,
      stakedTimestamp: 0n,
      unstakeAvailableTimestamp: 0n,
      lastClaimTimestamp: timestamp,
      totalRewardsClaimed: existingHero.totalRewardsClaimed + totalRewardsWithGacha,
      totalClaims: existingHero.totalClaims + 1,
    };
    await Promise.all([
      // Stocke l'événement brut
      context.Dragma_Unstaked.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        requestId,
        gachaTokenId,
        weaponShardQty,
        primaryRewards,
        secondaryRewards,
        tertiaryRewards,
      }),
      // Met à jour le héro : staking désactivé
      context.Hero.set(unstakedHero),
      (async () => {
        if (existingHero.staked) {
          const duration = timestamp - (existingHero.stakedTimestamp || 0n);
          const zone = getDragmaZoneFromStakingType(existingHero.stakingType);
          
          const global = await getOrCreateDragmaGlobalStats(context);
          // Current active staked (alive)
          global.totalHeroes -= 1;
          global.totalHeroesPerZone[zone] -= 1;
          global.currentActiveStaked -= 1;
          global.currentActiveStakedPerZone[zone] -= 1;
          // Totals
          global.totalUnstakes += 1;
          global.completedSessions += 1;
          global.completedSessionsPerZone[zone] += 1;
          global.heroesByLevel[existingHero.level] -= 1;
          if (global.currentTotalByLevel) {
            global.currentTotalByLevel[existingHero.level] -= 1;
          }
          global.heroesByLevelPerZone[zone][existingHero.level] -= 1;
          global.unstakesByLevelPerZone[zone][existingHero.level] += 1;
          global.completedByLevelPerZone[zone][existingHero.level] += 1;
          global.currentActiveByLevelPerZone[zone][existingHero.level] -= 1;
          global.totalRewardsAmount += totalRewardsWithGacha;
          global.totalShardsWon += Number(weaponShardQty);
          
          // Met à jour les rewards par zone avec le nouveau système
          global.rewardsPerZone = updateRewardsPerZone(global.rewardsPerZone, zone, [...primaryRewards, ...secondaryRewards, ...tertiaryRewards]);
          
          // Track gacha statistics
          if (gachaTokenId > 0n) {
            global.totalGachaWon += 1;
            const gachaIndex = Number(gachaTokenId) - 1; // 1->0, 2->1, 3->2, 4->3
            if (gachaIndex >= 0 && gachaIndex < 4) {
              global.gachaByTokenId[gachaIndex] += 1;
              global.gachaPerZone[zone] += 1;
              global.gachaByZoneAndTokenId[zone][gachaIndex] += 1;
            }
          }
          
          global.lastUpdated = timestamp;
          context.DragmaGlobalStats.set(global);

          const userStats = await getOrCreateDragmaUserStats(context, owner.toLowerCase());
          userStats.totalHeroes -= 1;
          userStats.heroesPerZone[zone] -= 1;
          userStats.currentActiveStaked -= 1;
          userStats.currentActiveStakedPerZone[zone] -= 1;
          userStats.totalUnstakes += 1;
          userStats.completedSessions += 1;
          userStats.completedSessionsPerZone[zone] += 1;
          userStats.heroesByLevel[existingHero.level] -= 1;
          if (userStats.currentTotalByLevel) {
            userStats.currentTotalByLevel[existingHero.level] -= 1;
          }
          userStats.heroesByLevelPerZone[zone][existingHero.level] -= 1;
          userStats.unstakesByLevelPerZone[zone][existingHero.level] += 1;
          userStats.completedByLevelPerZone[zone][existingHero.level] += 1;
          userStats.currentActiveByLevelPerZone[zone][existingHero.level] -= 1;
          userStats.totalRewardsAmount += totalRewardsWithGacha;
          userStats.totalShardsWon += Number(weaponShardQty);
          
          // Met à jour les rewards par zone avec le nouveau système
          userStats.rewardsPerZone = updateRewardsPerZone(userStats.rewardsPerZone, zone, [...primaryRewards, ...secondaryRewards, ...tertiaryRewards]);
          
          // Track gacha statistics for user
          if (gachaTokenId > 0n) {
            userStats.totalGachaWon += 1;
            const gachaIndex = Number(gachaTokenId) - 1; // 1->0, 2->1, 3->2, 4->3
            if (gachaIndex >= 0 && gachaIndex < 4) {
              userStats.gachaByTokenId[gachaIndex] += 1;
              userStats.gachaPerZone[zone] += 1;
              userStats.gachaByZoneAndTokenId[zone][gachaIndex] += 1;
            }
          }
          
          context.DragmaUserStats.set(userStats);
        }

        // Met à jour les balances du joueur - OPTIMISÉ EN BATCH
        const player = await getOrCreatePlayer(context, owner);
        let playerUpdated = false;
        
        // Préparer tous les updates d'items en batch
        const itemUpdates: Array<{itemId: bigint, amountChange: bigint}> = [];
        
        // Weapon shards (token ID 1)
        if (weaponShardQty > 0n) {
          itemUpdates.push({itemId: 1n, amountChange: weaponShardQty});
          playerUpdated = true;
        }
        
        // Items rewards
        const allItemRewards = [...primaryRewards, ...secondaryRewards, ...tertiaryRewards];
        for (const itemId of allItemRewards) {
          itemUpdates.push({itemId, amountChange: 1n});
          playerUpdated = true;
        }
        
        // Appliquer tous les updates d'items en une fois
        if (itemUpdates.length > 0) {
          const updatedPlayer = await updateItemsBalancesBatch(context, owner, itemUpdates, player);
          Object.assign(player, updatedPlayer);
        }
        
        // Gacha token - séparé car pas dans itemsBalances
        if (gachaTokenId > 0n) {
          const gachaIndex = Number(gachaTokenId) - 1; // 1->0, 2->1, 3->2, 4->3
          if (gachaIndex >= 0 && gachaIndex < 4) {
            player.gachaBalances[gachaIndex] += 1n;
            playerUpdated = true;
          }
        }
        
        // UN SEUL UPDATE du Player si nécessaire
        if (playerUpdated) {
          context.Player.set(player);
        }

        await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, timestamp, owner, 'DRAGMA_UNSTAKE', {
          heroId: heroId.toString(), 
          gachaTokenId: gachaTokenId.toString(),
          weaponShardQty: weaponShardQty.toString(),
          totalRewards: totalRewardsWithGacha.toString(),
          primaryRewards: primaryRewards.map((id: bigint) => id.toString()),
          secondaryRewards: secondaryRewards.map((id: bigint) => id.toString()),
          tertiaryRewards: tertiaryRewards.map((id: bigint) => id.toString())
        }, existingHero.id, 'DRAGMA', existingHero.stakingType);
      })()
    ]);
    if (existingHero.staked) {
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: -1 });
    }
    const updatedHeroWithCounts = {
      ...unstakedHero,
      totalUnstakes: unstakedHero.totalUnstakes + 1,
      totalStakingDuration: unstakedHero.totalStakingDuration + (timestamp - (existingHero.stakedTimestamp || 0n)),
    };
    context.Hero.set(updatedHeroWithCounts);
  },
});

/**
 * Handler pour Dragma.HeroDied
 * Un héro meurt dans Dragma
 */
Dragma.HeroDied.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    await context.Dragma_HeroDied.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner,
      heroId,
    });

    const zone = getDragmaZoneFromStakingType(existingHero.stakingType);
    
    const deadHero = { 
      ...existingHero, 
      isDead: true, 
      deathLocation: 'DRAGMA',
      lastDeathZone: zone,
      staked: false, // Un héros mort n'est plus considéré comme staked
      stakingType: undefined, // Reset staking type quand mort
      deathsCount: existingHero.deathsCount + 1,
      dragmaDeathCount: existingHero.dragmaDeathCount + 1,
      dragmaDeathPerZone: existingHero.dragmaDeathPerZone.map((val: number, idx: number) => 
        idx === zone ? val + 1 : val
      ),
    };
    context.Hero.set(deadHero);

    const global = await getOrCreateDragmaGlobalStats(context);
    if (existingHero.staked) {
      // Move from active to dead, keep totalHeroes unchanged
      global.currentActiveStaked -= 1;
      global.currentActiveStakedPerZone[zone] -= 1;
      global.heroesByLevel[existingHero.level] -= 1;
      global.heroesByLevelPerZone[zone][existingHero.level] -= 1;
      if (global.currentActiveByLevelPerZone) {
        global.currentActiveByLevelPerZone[zone][existingHero.level] -= 1;
      }
      await updatePlayerCounts(context, existingHero.owner_id, { stakedHeroCount: -1 });
    }
      global.currentDeadHeroes += 1;
    global.currentDeadHeroesPerZone[zone] += 1;
      if (global.currentDeadByLevel) {
        global.currentDeadByLevel[existingHero.level] += 1;
      }
    if (global.currentDeadByLevelPerZone) {
      global.currentDeadByLevelPerZone[zone][existingHero.level] += 1;
    }
    global.totalDeaths += 1;
    global.deathsPerZone[zone] += 1;
    global.lastUpdated = timestamp;
    context.DragmaGlobalStats.set(global);

    const userStats = await getOrCreateDragmaUserStats(context, owner.toLowerCase());
    if (existingHero.staked) {
      // Move from active to dead for this user, totals unchanged
      userStats.totalHeroes -= 1;
      userStats.heroesPerZone[zone] -= 1;
      userStats.currentActiveStaked -= 1;
      userStats.currentActiveStakedPerZone[zone] -= 1;
      userStats.heroesByLevel[existingHero.level] -= 1;
      userStats.heroesByLevelPerZone[zone][existingHero.level] -= 1;
      if (userStats.currentActiveByLevelPerZone) {
        userStats.currentActiveByLevelPerZone[zone][existingHero.level] -= 1;
      }
    }
    userStats.currentDeadHeroes += 1;
    userStats.currentDeadHeroesPerZone[zone] += 1;
    if (userStats.currentDeadByLevel) {
      userStats.currentDeadByLevel[existingHero.level] += 1;
    }
    if (userStats.currentDeadByLevelPerZone) {
      userStats.currentDeadByLevelPerZone[zone][existingHero.level] += 1;
    }
    userStats.totalDeaths += 1;
    userStats.deathsPerZone[zone] += 1;
    context.DragmaUserStats.set(userStats);

    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    const zoneEnum = existingHero.stakingType || getDragmaStakingType(BigInt(zone));
    await createActivity(
      context,
      id,
      timestamp,
      owner,
      'DEATH',
      { heroId: heroId.toString(), zone: zoneEnum },
      existingHero.id,
      'DRAGMA',
      existingHero.stakingType
    );
  },
});

/**
 * Handler pour Dragma.Revived
 * Un héro est ressuscité dans Dragma
 */
Dragma.Revived.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      return { hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, fee } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    const { hero } = loaderReturn as { hero: any | null };
    const existingHero = hero ?? await context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`);

    await context.Dragma_Revived.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      owner,
      heroId,
      fee,
    });

    const revivedHero = { 
      ...existingHero, 
      isDead: false, 
      deathLocation: undefined, // Reset death location when revived
      staked: false, // Un héros ressuscité reste unstaked, doit être restaké manuellement
      stakingType: undefined, // Reset staking type quand ressuscité
      revivalCount: existingHero.revivalCount + 1,
      spentOnRevive: existingHero.spentOnRevive + fee,
      dragmaRevivalCount: existingHero.dragmaRevivalCount + 1,
      dragmaReviveSpent: existingHero.dragmaReviveSpent + fee,
    };
    context.Hero.set(revivedHero);

    const global = await getOrCreateDragmaGlobalStats(context);
    global.totalRevivals += 1;
    global.totalSpentOnRevive += fee;
    // If revived from Dragma, decrement current dead counts
    if (existingHero.deathLocation === 'DRAGMA') {
      const zone = typeof existingHero.lastDeathZone === 'number' ? existingHero.lastDeathZone : getDragmaZoneFromStakingType(existingHero.stakingType);
      global.currentDeadHeroes = Math.max(0, (global.currentDeadHeroes || 0) - 1);
      if (typeof zone === 'number' && zone >= 0 && zone < 4) {
        global.currentDeadHeroesPerZone[zone] = Math.max(0, global.currentDeadHeroesPerZone[zone] - 1);
        if (global.currentDeadByLevelPerZone) {
          // Use hero.level at death time (approximate with current level)
          global.currentDeadByLevelPerZone[zone][existingHero.level] = Math.max(0, global.currentDeadByLevelPerZone[zone][existingHero.level] - 1);
        }
      }
      if (global.currentDeadByLevel) {
        global.currentDeadByLevel[existingHero.level] = Math.max(0, global.currentDeadByLevel[existingHero.level] - 1);
      }
    }
    global.lastUpdated = timestamp;
    context.DragmaGlobalStats.set(global);

    const userStats = await getOrCreateDragmaUserStats(context, owner.toLowerCase());
    userStats.totalRevivals += 1;
    userStats.totalSpentOnRevive += fee;
    if (existingHero.deathLocation === 'DRAGMA') {
      const zone = typeof existingHero.lastDeathZone === 'number' ? existingHero.lastDeathZone : getDragmaZoneFromStakingType(existingHero.stakingType);
      userStats.currentDeadHeroes = Math.max(0, (userStats.currentDeadHeroes || 0) - 1);
      if (typeof zone === 'number' && zone >= 0 && zone < 4) {
        userStats.currentDeadHeroesPerZone[zone] = Math.max(0, userStats.currentDeadHeroesPerZone[zone] - 1);
        if (userStats.currentDeadByLevelPerZone) {
          userStats.currentDeadByLevelPerZone[zone][existingHero.level] = Math.max(0, userStats.currentDeadByLevelPerZone[zone][existingHero.level] - 1);
        }
      }
      if (userStats.currentDeadByLevel) {
        userStats.currentDeadByLevel[existingHero.level] = Math.max(0, userStats.currentDeadByLevel[existingHero.level] - 1);
      }
    }
    context.DragmaUserStats.set(userStats);

    // Met à jour le totalSpent du joueur
    await updatePlayerTotalSpent(context, owner, fee);

    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    const zoneForActivity = typeof existingHero.lastDeathZone === 'number' ? existingHero.lastDeathZone : getDragmaZoneFromStakingType(existingHero.stakingType);
    const zoneEnum = typeof zoneForActivity === 'number' ? getDragmaStakingType(BigInt(zoneForActivity)) : (existingHero.stakingType || undefined);
    await createActivity(
      context,
      id,
      timestamp,
      owner,
      'REVIVAL',
      { heroId: heroId.toString(), fee: fee.toString(), zone: zoneEnum },
      existingHero.id,
      'DRAGMA',
      existingHero.stakingType
    );
  },
}); 

/**
 * Handler pour Dragma.WeaponDurabilityUpdated
 * Met à jour la durability d'une arme (peut la casser si durability = 0)
 * OPTIMISÉ : Pas de recalcul des stats car durability n'affecte pas les rewards
 */
Dragma.WeaponDurabilityUpdated.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { weaponId, newDurability } = event.params;
    
    if (context.isPreload) {
      // Premier run : charge l'arme et peut faire une mise à jour simple
      const weapon = await context.Weapon.get(weaponId.toString());
      
      // OPTIMISATION AVANCÉE: Peut faire la mise à jour directement dans le loader
      // si c'est une opération simple (durability n'affecte pas les calculs complexes)
      if (weapon) {
        const newDurabilityNum = Number(newDurability);
        await context.Weapon.set({
          ...weapon,
          durability: newDurabilityNum,
          broken: newDurabilityNum === 0,
        });
        return { weapon, updated: true };
      }
      
      return { weapon, updated: false };
    } else {
      // Second run : juste récupération
      const weapon = await context.Weapon.get(weaponId.toString());
      return { weapon, updated: false };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, weaponId, oldDurability, newDurability } = event.params;

    const { weapon, updated } = loaderReturn as { weapon: any | null; updated: boolean };

    // Stocke toujours l'événement brut
    await context.Dragma_WeaponDurabilityUpdated.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      user,
      weaponId,
      oldDurability,
      newDurability,
    });

    // Si pas encore mis à jour dans le loader, le faire maintenant
    if (!updated) {
      const existingWeapon = weapon ?? await context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`);
      
      const newDurabilityNum = Number(newDurability);
      await context.Weapon.set({
        ...existingWeapon,
        durability: newDurabilityNum,
        broken: newDurabilityNum === 0,
      });
      await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, BigInt(event.block.timestamp), user, 'DURABILITY_UPDATE', { weaponId: weaponId.toString(), oldDurability: oldDurability.toString(), newDurability: newDurability.toString() }, undefined);
    }
  },
});

/**
 * Handler pour Dragma.WeaponSharpnessUpdated
 * Met à jour la sharpness d'une arme (affecte les rewards du héro)
 */
Dragma.WeaponSharpnessUpdated.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { weaponId } = event.params;
    
    if (context.isPreload) {
      // Premier run : charge weapon et hero équipé en parallèle
      const weapon = await context.Weapon.get(weaponId.toString());

      let hero: any | null = null;
      if (weapon && weapon.equipped && weapon.equippedHeroId) {
        hero = await context.Hero.get(weapon.equippedHeroId);
      }

      return { weapon, hero };
    } else {
      // Second run : récupération optimisée
      const weapon = await context.Weapon.get(weaponId.toString());
      let hero: any | null = null;
      if (weapon && weapon.equipped && weapon.equippedHeroId) {
        hero = await context.Hero.get(weapon.equippedHeroId);
      }
      return { weapon, hero };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { user, weaponId, oldSharpness, newSharpness } = event.params;

    const { weapon, hero } = loaderReturn as { weapon: any | null; hero: any | null };
    const existingWeapon = weapon ?? await context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`);

    // Parallélisation : Stockage event + mise à jour weapon+hero
    await Promise.all([
      // Stocke l'événement brut
      context.Dragma_WeaponSharpnessUpdated.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        user,
        weaponId,
        oldSharpness,
        newSharpness,
      }),
      
      // Met à jour la sharpness ET recalcule les rewards
      updateWeaponAndHeroStats(context, existingWeapon, {
        sharpness: Number(newSharpness),
      }, hero)
    ]);
    await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, BigInt(event.block.timestamp), user, 'SHARPNESS_UPDATE', { weaponId: weaponId.toString(), oldSharpness: oldSharpness.toString(), newSharpness: newSharpness.toString() }, undefined);
  },
}); 