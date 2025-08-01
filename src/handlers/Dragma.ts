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
import { calculateDragmaUnstakeAvailable, getDragmaStakingType } from "../helpers/calculations";

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
    const stakedHero = {
      ...existingHero,
      staked: true,
      stakingType: getDragmaStakingType(attackZone),
      stakedTimestamp: timestamp,
      unstakeAvailableTimestamp: calculateDragmaUnstakeAvailable(timestamp), // 12h cooldown pour Dragma
      lastClaimTimestamp: 0n,
    };
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
          global.totalHeroes += 1;
          global.totalHeroesPerZone[Number(attackZone)] += 1;
          global.heroesByLevel[existingHero.level] += 1;
          global.totalFeesPerZone[Number(attackZone)] += entryFee;
          global.lastUpdated = timestamp;
          context.DragmaGlobalStats.set(global);

          const userStats = await getOrCreateDragmaUserStats(context, owner.toLowerCase());
          userStats.totalHeroes += 1;
          userStats.heroesPerZone[Number(attackZone)] += 1;
          userStats.heroesByLevel[existingHero.level] += 1;
          userStats.totalFees += entryFee;
          userStats.feesPerZone[Number(attackZone)] += entryFee;
          userStats.totalSessionsPerZone[Number(attackZone)] += 1;
          context.DragmaUserStats.set(userStats);
          
          // Met à jour le totalSpent du joueur avec les fees de staking
          await updatePlayerTotalSpent(context, owner, entryFee);
        }
        await createActivity(context, `${event.chainId}_${event.block.number}_${event.logIndex}`, timestamp, owner, 'DRAGMA_STAKE', {heroId: heroId.toString(), entryFee: entryFee.toString(), attackZone: attackZone.toString()}, existingHero.id, 'Dragma', getDragmaStakingType(attackZone));
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
 * Handler pour Dragma.Unstake
 * Unstake un héro avec rewards
 */
Dragma.Unstake.handlerWithLoader({
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
      context.Dragma_Unstake.set({
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
          const zone = Number(existingHero.stakingType?.split('_')[2] || 0);
          
          const global = await getOrCreateDragmaGlobalStats(context);
          global.totalHeroes -= 1;
          global.totalHeroesPerZone[zone] -= 1;
          global.heroesByLevel[existingHero.level] -= 1;
          global.totalRewardsAmount += totalRewardsWithGacha;
          global.totalShardsWon += Number(weaponShardQty);
          
          // Met à jour les rewards par zone avec le nouveau système
          global.rewardsPerZone = updateRewardsPerZone(global.rewardsPerZone, zone, [...primaryRewards, ...secondaryRewards, ...tertiaryRewards]);
          
          global.lastUpdated = timestamp;
          context.DragmaGlobalStats.set(global);

          const userStats = await getOrCreateDragmaUserStats(context, owner.toLowerCase());
          userStats.totalHeroes -= 1;
          userStats.heroesPerZone[zone] -= 1;
          userStats.heroesByLevel[existingHero.level] -= 1;
          userStats.totalRewardsAmount += totalRewardsWithGacha;
          userStats.totalShardsWon += Number(weaponShardQty);
          userStats.totalUnstakes += 1;
          
          // Met à jour les rewards par zone avec le nouveau système
          userStats.rewardsPerZone = updateRewardsPerZone(userStats.rewardsPerZone, zone, [...primaryRewards, ...secondaryRewards, ...tertiaryRewards]);
          
          context.DragmaUserStats.set(userStats);
        }

        // Met à jour les balances du joueur - OPTIMISÉ EN BATCH
        const player = await getOrCreatePlayer(context, owner);
        let playerUpdated = false;
        
        // Weapon shards (index 0) - batch avec les autres items
        if (weaponShardQty > 0n) {
          const weaponShardIndex = 0; // Weapon shards = index 0
          player.itemsBalances[weaponShardIndex] += weaponShardQty;
          playerUpdated = true;
        }
        
        // Gacha token - batch avec les autres items
        if (gachaTokenId > 0n) {
          const gachaIndex = Number(gachaTokenId) - 1; // 1->0, 2->1, 3->2, 4->3
          if (gachaIndex >= 0 && gachaIndex < 4) {
            player.gachaBalances[gachaIndex] += 1n;
            playerUpdated = true;
          }
        }
        
        // Items rewards - BATCH OPTIMISÉ
        const allItemRewards = [...primaryRewards, ...secondaryRewards, ...tertiaryRewards];
        for (const itemId of allItemRewards) {
          const itemIndex = Number(itemId) - 1; // Token ID 1-21 -> index 0-20
          if (itemIndex >= 0 && itemIndex < 21) {
            player.itemsBalances[itemIndex] += 1n;
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
        }, existingHero.id, 'Dragma', existingHero.stakingType);
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

    const deadHero = { 
      ...existingHero, 
      isDead: true, 
      deathLocation: 'DRAGMA',
      staked: false, // Un héros mort n'est plus considéré comme staked
      stakingType: undefined, // Reset staking type quand mort
      deathsCount: existingHero.deathsCount + 1,
      dragmaDeathCount: existingHero.dragmaDeathCount + 1,
    };
    context.Hero.set(deadHero);

    const global = await getOrCreateDragmaGlobalStats(context);
    global.totalDeaths += 1;
    global.lastUpdated = timestamp;
    context.DragmaGlobalStats.set(global);

    const userStats = await getOrCreateDragmaUserStats(context, owner.toLowerCase());
    userStats.totalDeaths += 1;
    context.DragmaUserStats.set(userStats);

    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    await createActivity(context, id, timestamp, owner, 'DRAGMA_DEATH', {heroId: heroId.toString()}, existingHero.id, 'Dragma', existingHero.stakingType);
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
    global.lastUpdated = timestamp;
    context.DragmaGlobalStats.set(global);

    const userStats = await getOrCreateDragmaUserStats(context, owner.toLowerCase());
    userStats.totalRevivals += 1;
    userStats.totalSpentOnRevive += fee;
    context.DragmaUserStats.set(userStats);

    // Met à jour le totalSpent du joueur
    await updatePlayerTotalSpent(context, owner, fee);

    const id = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    await createActivity(context, id, timestamp, owner, 'DRAGMA_REVIVAL', {heroId: heroId.toString(), fee: fee.toString()}, existingHero.id, 'Dragma', existingHero.stakingType);
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