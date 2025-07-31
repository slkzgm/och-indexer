import {
  Gym,
} from "generated";
import { handleHeroTraining } from "../helpers/training";
import { getOrCreateHeroesGlobalStats } from "../helpers/stats";
import { getOrCreateGymGlobalStats, getOrCreateGymUserStats } from "../helpers/stats";
import { createActivity } from "../helpers/activity";
import { calculateTrainingCost } from "../helpers/calculations";
import { updatePlayerTotalSpent } from "../helpers/player";

/**
 * Handler pour Gym.ChaosUpgraded
 * Training avec RNG - peut échouer
 */
Gym.ChaosUpgraded.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      // Premier run : charge le héro et son arme équipée en parallèle
      const hero = await context.Hero.get(heroId.toString());
      
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      
      return { hero, equippedWeapon };
    } else {
      // Second run : récupération simple
      const hero = await context.Hero.get(heroId.toString());
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      return { hero, equippedWeapon };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, season, oldLevel, newLevel, chances } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    
    const { hero, equippedWeapon } = loaderReturn as { hero: any | null; equippedWeapon: any | null };

    // Parallélisation : Stockage event + mise à jour Hero
    await Promise.all([
      // Stocke l'événement brut
      context.Gym_ChaosUpgraded.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        season,
        oldLevel,
        newLevel,
        chances,
      }),
      
      // Met à jour l'entité Hero (handleHeroTraining utilise les entités pré-chargées)
      handleHeroTraining(
        context,
        heroId.toString(),
        Number(oldLevel),
        Number(newLevel),
        timestamp,
        hero, // Passe le héro pré-chargé
        equippedWeapon // Passe l'arme pré-chargée
      )
    ]);

    // Mise à jour des stats du player après le training
    const updatedHero = await context.Hero.get(heroId.toString());
    if (updatedHero) {
      const player = await context.Player.get(updatedHero.owner_id);
      if (player && Number(oldLevel) !== updatedHero.level) {
        player.heroesByLevel[Number(oldLevel)] -= 1;
        player.heroesByLevel[updatedHero.level] += 1;
        context.Player.set(player);
      }
      // Mise à jour des stats globales
      if (Number(oldLevel) !== updatedHero.level) {
        const global = await getOrCreateHeroesGlobalStats(context);
        global.heroesByLevel[Number(oldLevel)] -= 1;
        global.heroesByLevel[updatedHero.level] += 1;
        global.lastUpdated = timestamp;
        context.HeroesGlobalStats.set(global);
      }
      // Calcul de l'outcome et détermination du succès/échec
      const outcome = Number(newLevel) - Number(oldLevel);
      const isSuccess = outcome > 0;
      const trainingType = 1; // Chaos = 1
      
      // Calcul du coût du training
      const trainingCost = calculateTrainingCost(Number(oldLevel));
      
      // Mise à jour des stats de training (type 1 = Chaos)
      const [gymGlobal, gymUser] = await Promise.all([
        getOrCreateGymGlobalStats(context),
        getOrCreateGymUserStats(context, updatedHero.owner_id)
      ]);
      
      // Stats globales
      gymGlobal.totalAttemptedTrainings += 1;
      gymGlobal.attemptedByType[trainingType] += 1;
      gymGlobal.totalSpent += trainingCost;
      gymGlobal.spentByType[trainingType] += trainingCost;
      if (isSuccess) {
        gymGlobal.totalSuccessfulTrainings += 1;
        gymGlobal.successfulByType[trainingType] += 1;
      } else {
        gymGlobal.totalFailedTrainings += 1;
        gymGlobal.failedByType[trainingType] += 1;
      }
      
      // Calcul des outcomes (Chaos: -5 à +5, donc index 0-10)
      const outcomeIndex = outcome + 5; // -5 devient 0, +5 devient 10
      if (outcomeIndex >= 0 && outcomeIndex < 11) {
        gymGlobal.outcomesCountByType[trainingType][outcomeIndex] += 1;
        gymGlobal.totalOutcomeSumByType[trainingType] += BigInt(outcome);
      }
      
      // Calcul des chances moyennes
      if (chances && chances.length > 0) {
        gymGlobal.sumOfChancesByType[trainingType] = gymGlobal.sumOfChancesByType[trainingType].map((val: bigint, idx: number) => 
          idx < chances.length ? val + chances[idx] : val
        );
        gymGlobal.chancesCountByType[trainingType] += 1;
      }
      
      gymGlobal.lastUpdated = timestamp;
      context.GymGlobalStats.set(gymGlobal);

      // Stats utilisateur
      gymUser.totalAttemptedTrainings += 1;
      gymUser.attemptedByType[trainingType] += 1;
      gymUser.totalSpent += trainingCost;
      gymUser.spentByType[trainingType] += trainingCost;
      if (isSuccess) {
        gymUser.totalSuccessfulTrainings += 1;
        gymUser.successfulByType[trainingType] += 1;
      } else {
        gymUser.totalFailedTrainings += 1;
        gymUser.failedByType[trainingType] += 1;
      }
      
      // Calcul des outcomes pour l'utilisateur
      if (outcomeIndex >= 0 && outcomeIndex < 11) {
        gymUser.outcomesCountByType[trainingType][outcomeIndex] += 1;
        gymUser.totalOutcomeSumByType[trainingType] += BigInt(outcome);
      }
      
      // Calcul des chances moyennes pour l'utilisateur
      if (chances && chances.length > 0) {
        gymUser.sumOfChancesByType[trainingType] = gymUser.sumOfChancesByType[trainingType].map((val: bigint, idx: number) => 
          idx < chances.length ? val + chances[idx] : val
        );
        gymUser.chancesCountByType[trainingType] += 1;
      }
      
      context.GymUserStats.set(gymUser);

      // Met à jour le totalSpent du joueur
      await updatePlayerTotalSpent(context, updatedHero.owner_id, trainingCost);

      // Mise à jour du hero
      const heroUpdates = {
        ...updatedHero,
        totalAttemptedTrainings: updatedHero.totalAttemptedTrainings + 1,
        totalTrainingCost: updatedHero.totalTrainingCost + trainingCost,
        attemptedByType: updatedHero.attemptedByType.map((val: number, idx: number) => idx === trainingType ? val + 1 : val),
        spentByType: updatedHero.spentByType.map((val: bigint, idx: number) => idx === trainingType ? val + trainingCost : val)
      };
      
      if (isSuccess) {
        heroUpdates.totalSuccessfulTrainings = updatedHero.totalSuccessfulTrainings + 1;
        heroUpdates.successfulByType = updatedHero.successfulByType.map((val: number, idx: number) => idx === trainingType ? val + 1 : val);
      } else {
        heroUpdates.totalFailedTrainings = updatedHero.totalFailedTrainings + 1;
        heroUpdates.failedByType = updatedHero.failedByType.map((val: number, idx: number) => idx === trainingType ? val + 1 : val);
      }
      
      // Calcul des outcomes pour le hero
      if (outcomeIndex >= 0 && outcomeIndex < 11) {
        heroUpdates.outcomesCountByType = updatedHero.outcomesCountByType.map((typeArray: number[], typeIdx: number) => 
          typeIdx === trainingType 
            ? typeArray.map((val: number, idx: number) => idx === outcomeIndex ? val + 1 : val)
            : typeArray
        );
        heroUpdates.totalOutcomeSumByType = updatedHero.totalOutcomeSumByType.map((val: bigint, idx: number) => 
          idx === trainingType ? val + BigInt(outcome) : val
        );
      }
      
      // Calcul des chances moyennes pour le hero
      if (chances && chances.length > 0) {
        heroUpdates.sumOfChancesByType = updatedHero.sumOfChancesByType.map((typeArray: bigint[], typeIdx: number) => 
          typeIdx === trainingType 
            ? typeArray.map((val: bigint, idx: number) => idx < chances.length ? val + chances[idx] : val)
            : typeArray
        );
        heroUpdates.chancesCountByType = updatedHero.chancesCountByType.map((val: number, idx: number) => 
          idx === trainingType ? val + 1 : val
        );
      }
      
      context.Hero.set(heroUpdates);
    }
    // Create activity
    const activityId = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    await createActivity(context, activityId, timestamp, owner, 'TRAINING_UPGRADE', {type: 'Chaos', oldLevel: oldLevel.toString(), newLevel: newLevel.toString(), result: (Number(newLevel) - Number(oldLevel)).toString(), outcome: 'Success', chances: chances.map((c: bigint) => c.toString())}, heroId.toString(), 'Gym', undefined);
  },
});

/**
 * Handler pour Gym.NormalUpgraded  
 * Training normal - succès garanti
 */
Gym.NormalUpgraded.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      
      return { hero, equippedWeapon };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      return { hero, equippedWeapon };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, season, oldLevel, newLevel } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    
    const { hero, equippedWeapon } = loaderReturn as { hero: any | null; equippedWeapon: any | null };

    // Parallélisation optimisée
    await Promise.all([
      // Stocke l'événement brut
      context.Gym_NormalUpgraded.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        season,
        oldLevel,
        newLevel,
      }),
      
      // Met à jour l'entité Hero
      handleHeroTraining(
        context,
        heroId.toString(),
        Number(oldLevel),
        Number(newLevel),
        timestamp,
        hero,
        equippedWeapon
      )
    ]);

    // Mise à jour des stats du player après le training
    const updatedHero = await context.Hero.get(heroId.toString());
    if (updatedHero) {
      const player = await context.Player.get(updatedHero.owner_id);
      if (player && Number(oldLevel) !== updatedHero.level) {
        player.heroesByLevel[Number(oldLevel)] -= 1;
        player.heroesByLevel[updatedHero.level] += 1;
        context.Player.set(player);
      }
      // Mise à jour des stats globales
      if (Number(oldLevel) !== updatedHero.level) {
        const global = await getOrCreateHeroesGlobalStats(context);
        global.heroesByLevel[Number(oldLevel)] -= 1;
        global.heroesByLevel[updatedHero.level] += 1;
        global.lastUpdated = timestamp;
        context.HeroesGlobalStats.set(global);
      }
      // Calcul de l'outcome et détermination du succès/échec
      const outcome = Number(newLevel) - Number(oldLevel);
      const isSuccess = outcome > 0;
      const trainingType = 0; // Normal = 0
      
      // Calcul du coût du training
      const trainingCost = calculateTrainingCost(Number(oldLevel));
      
      // Mise à jour des stats de training (type 0 = Normal)
      const [gymGlobal, gymUser] = await Promise.all([
        getOrCreateGymGlobalStats(context),
        getOrCreateGymUserStats(context, updatedHero.owner_id)
      ]);
      
      // Stats globales
      gymGlobal.totalAttemptedTrainings += 1;
      gymGlobal.attemptedByType[trainingType] += 1;
      gymGlobal.totalSpent += trainingCost;
      gymGlobal.spentByType[trainingType] += trainingCost;
      if (isSuccess) {
        gymGlobal.totalSuccessfulTrainings += 1;
        gymGlobal.successfulByType[trainingType] += 1;
      } else {
        gymGlobal.totalFailedTrainings += 1;
        gymGlobal.failedByType[trainingType] += 1;
      }
      
      // Calcul des outcomes (Normal: +1 seulement, donc index 1)
      const outcomeIndex = 1; // Normal training donne toujours +1
      gymGlobal.outcomesCountByType[trainingType][outcomeIndex] += 1;
      gymGlobal.totalOutcomeSumByType[trainingType] += BigInt(outcome);
      
      gymGlobal.lastUpdated = timestamp;
      context.GymGlobalStats.set(gymGlobal);

      // Stats utilisateur
      gymUser.totalAttemptedTrainings += 1;
      gymUser.attemptedByType[trainingType] += 1;
      gymUser.totalSpent += trainingCost;
      gymUser.spentByType[trainingType] += trainingCost;
      if (isSuccess) {
        gymUser.totalSuccessfulTrainings += 1;
        gymUser.successfulByType[trainingType] += 1;
      } else {
        gymUser.totalFailedTrainings += 1;
        gymUser.failedByType[trainingType] += 1;
      }
      
      // Calcul des outcomes pour l'utilisateur
      gymUser.outcomesCountByType[trainingType][outcomeIndex] += 1;
      gymUser.totalOutcomeSumByType[trainingType] += BigInt(outcome);
      
      context.GymUserStats.set(gymUser);

      // Met à jour le totalSpent du joueur
      await updatePlayerTotalSpent(context, updatedHero.owner_id, trainingCost);

      // Mise à jour du hero
      const heroUpdates = {
        ...updatedHero,
        totalAttemptedTrainings: updatedHero.totalAttemptedTrainings + 1,
        totalTrainingCost: updatedHero.totalTrainingCost + trainingCost,
        attemptedByType: updatedHero.attemptedByType.map((val: number, idx: number) => idx === trainingType ? val + 1 : val),
        spentByType: updatedHero.spentByType.map((val: bigint, idx: number) => idx === trainingType ? val + trainingCost : val)
      };
      
      if (isSuccess) {
        heroUpdates.totalSuccessfulTrainings = updatedHero.totalSuccessfulTrainings + 1;
        heroUpdates.successfulByType = updatedHero.successfulByType.map((val: number, idx: number) => idx === trainingType ? val + 1 : val);
      } else {
        heroUpdates.totalFailedTrainings = updatedHero.totalFailedTrainings + 1;
        heroUpdates.failedByType = updatedHero.failedByType.map((val: number, idx: number) => idx === trainingType ? val + 1 : val);
      }
      
      // Calcul des outcomes pour le hero
      heroUpdates.outcomesCountByType = updatedHero.outcomesCountByType.map((typeArray: number[], typeIdx: number) => 
        typeIdx === trainingType 
          ? typeArray.map((val: number, idx: number) => idx === outcomeIndex ? val + 1 : val)
          : typeArray
      );
      heroUpdates.totalOutcomeSumByType = updatedHero.totalOutcomeSumByType.map((val: bigint, idx: number) => 
        idx === trainingType ? val + BigInt(outcome) : val
      );
      
      context.Hero.set(heroUpdates);
    }
    // Create activity
    const activityId = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    await createActivity(context, activityId, timestamp, owner, 'TRAINING_UPGRADE', {type: 'Normal', oldLevel: oldLevel.toString(), newLevel: newLevel.toString(), result: (Number(newLevel) - Number(oldLevel)).toString(), outcome: 'Success'}, heroId.toString(), 'Gym', undefined);
  },
});

/**
 * Handler pour Gym.UnknownUpgraded
 * Training avec type inconnu - garde les chances pour debug
 */
Gym.UnknownUpgraded.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    const { heroId } = event.params;
    
    if (context.isPreload) {
      const hero = await context.Hero.get(heroId.toString());
      
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      
      return { hero, equippedWeapon };
    } else {
      const hero = await context.Hero.get(heroId.toString());
      let equippedWeapon: any | null = null;
      if (hero?.equippedWeapon_id) {
        equippedWeapon = await context.Weapon.get(hero.equippedWeapon_id);
      }
      return { hero, equippedWeapon };
    }
  },

  handler: async ({ event, context, loaderReturn }: { event: any; context: any; loaderReturn: any }) => {
    const { owner, heroId, season, oldLevel, newLevel, chances } = event.params;
    const timestamp = BigInt(event.block.timestamp);
    
    const { hero, equippedWeapon } = loaderReturn as { hero: any | null; equippedWeapon: any | null };

    // Parallélisation optimisée
    await Promise.all([
      // Stocke l'événement brut
      context.Gym_UnknownUpgraded.set({
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        owner,
        heroId,
        season,
        oldLevel,
        newLevel,
        chances,
      }),
      
      // Met à jour l'entité Hero
      handleHeroTraining(
        context,
        heroId.toString(),
        Number(oldLevel),
        Number(newLevel),
        timestamp,
        hero,
        equippedWeapon
      )
    ]);

    // Mise à jour des stats du player après le training
    const updatedHero = await context.Hero.get(heroId.toString());
    if (updatedHero) {
      const player = await context.Player.get(updatedHero.owner_id);
      if (player && Number(oldLevel) !== updatedHero.level) {
        player.heroesByLevel[Number(oldLevel)] -= 1;
        player.heroesByLevel[updatedHero.level] += 1;
        context.Player.set(player);
      }
      // Mise à jour des stats globales
      if (Number(oldLevel) !== updatedHero.level) {
        const global = await getOrCreateHeroesGlobalStats(context);
        global.heroesByLevel[Number(oldLevel)] -= 1;
        global.heroesByLevel[updatedHero.level] += 1;
        global.lastUpdated = timestamp;
        context.HeroesGlobalStats.set(global);
      }
      // Calcul de l'outcome et détermination du succès/échec
      const outcome = Number(newLevel) - Number(oldLevel);
      const isSuccess = outcome > 0;
      const trainingType = 2; // Unknown = 2
      
      // Calcul du coût du training
      const trainingCost = calculateTrainingCost(Number(oldLevel));
      
      // Mise à jour des stats de training (type 2 = Unknown)
      const [gymGlobal, gymUser] = await Promise.all([
        getOrCreateGymGlobalStats(context),
        getOrCreateGymUserStats(context, updatedHero.owner_id)
      ]);
      
      // Stats globales
      gymGlobal.totalAttemptedTrainings += 1;
      gymGlobal.attemptedByType[trainingType] += 1;
      gymGlobal.totalSpent += trainingCost;
      gymGlobal.spentByType[trainingType] += trainingCost;
      if (isSuccess) {
        gymGlobal.totalSuccessfulTrainings += 1;
        gymGlobal.successfulByType[trainingType] += 1;
      } else {
        gymGlobal.totalFailedTrainings += 1;
        gymGlobal.failedByType[trainingType] += 1;
      }
      
      // Calcul des outcomes (Unknown: -1 à +3, donc index 0-4)
      const outcomeIndex = outcome + 1; // -1 devient 0, +3 devient 4
      if (outcomeIndex >= 0 && outcomeIndex < 5) {
        gymGlobal.outcomesCountByType[trainingType][outcomeIndex] += 1;
        gymGlobal.totalOutcomeSumByType[trainingType] += BigInt(outcome);
      }
      
      // Calcul des chances moyennes
      if (chances && chances.length > 0) {
        gymGlobal.sumOfChancesByType[trainingType] = gymGlobal.sumOfChancesByType[trainingType].map((val: bigint, idx: number) => 
          idx < chances.length ? val + chances[idx] : val
        );
        gymGlobal.chancesCountByType[trainingType] += 1;
      }
      
      gymGlobal.lastUpdated = timestamp;
      context.GymGlobalStats.set(gymGlobal);

      // Stats utilisateur
      gymUser.totalAttemptedTrainings += 1;
      gymUser.attemptedByType[trainingType] += 1;
      gymUser.totalSpent += trainingCost;
      gymUser.spentByType[trainingType] += trainingCost;
      if (isSuccess) {
        gymUser.totalSuccessfulTrainings += 1;
        gymUser.successfulByType[trainingType] += 1;
      } else {
        gymUser.totalFailedTrainings += 1;
        gymUser.failedByType[trainingType] += 1;
      }
      
      // Calcul des outcomes pour l'utilisateur
      if (outcomeIndex >= 0 && outcomeIndex < 5) {
        gymUser.outcomesCountByType[trainingType][outcomeIndex] += 1;
        gymUser.totalOutcomeSumByType[trainingType] += BigInt(outcome);
      }
      
      // Calcul des chances moyennes pour l'utilisateur
      if (chances && chances.length > 0) {
        gymUser.sumOfChancesByType[trainingType] = gymUser.sumOfChancesByType[trainingType].map((val: bigint, idx: number) => 
          idx < chances.length ? val + chances[idx] : val
        );
        gymUser.chancesCountByType[trainingType] += 1;
      }
      
      context.GymUserStats.set(gymUser);

      // Met à jour le totalSpent du joueur
      await updatePlayerTotalSpent(context, updatedHero.owner_id, trainingCost);

      // Mise à jour du hero
      const heroUpdates = {
        ...updatedHero,
        totalAttemptedTrainings: updatedHero.totalAttemptedTrainings + 1,
        totalTrainingCost: updatedHero.totalTrainingCost + trainingCost,
        attemptedByType: updatedHero.attemptedByType.map((val: number, idx: number) => idx === trainingType ? val + 1 : val),
        spentByType: updatedHero.spentByType.map((val: bigint, idx: number) => idx === trainingType ? val + trainingCost : val)
      };
      
      if (isSuccess) {
        heroUpdates.totalSuccessfulTrainings = updatedHero.totalSuccessfulTrainings + 1;
        heroUpdates.successfulByType = updatedHero.successfulByType.map((val: number, idx: number) => idx === trainingType ? val + 1 : val);
      } else {
        heroUpdates.totalFailedTrainings = updatedHero.totalFailedTrainings + 1;
        heroUpdates.failedByType = updatedHero.failedByType.map((val: number, idx: number) => idx === trainingType ? val + 1 : val);
      }
      
      // Calcul des outcomes pour le hero
      if (outcomeIndex >= 0 && outcomeIndex < 5) {
        heroUpdates.outcomesCountByType = updatedHero.outcomesCountByType.map((typeArray: number[], typeIdx: number) => 
          typeIdx === trainingType 
            ? typeArray.map((val: number, idx: number) => idx === outcomeIndex ? val + 1 : val)
            : typeArray
        );
        heroUpdates.totalOutcomeSumByType = updatedHero.totalOutcomeSumByType.map((val: bigint, idx: number) => 
          idx === trainingType ? val + BigInt(outcome) : val
        );
      }
      
      // Calcul des chances moyennes pour le hero
      if (chances && chances.length > 0) {
        heroUpdates.sumOfChancesByType = updatedHero.sumOfChancesByType.map((typeArray: bigint[], typeIdx: number) => 
          typeIdx === trainingType 
            ? typeArray.map((val: bigint, idx: number) => idx < chances.length ? val + chances[idx] : val)
            : typeArray
        );
        heroUpdates.chancesCountByType = updatedHero.chancesCountByType.map((val: number, idx: number) => 
          idx === trainingType ? val + 1 : val
        );
      }
      
      context.Hero.set(heroUpdates);
    }
    // Create activity
    const activityId = `${event.chainId}_${event.block.number}_${event.logIndex}`;
    await createActivity(context, activityId, timestamp, owner, 'TRAINING_UPGRADE', {type: 'Unknown', oldLevel: oldLevel.toString(), newLevel: newLevel.toString(), result: (Number(newLevel) - Number(oldLevel)).toString(), outcome: 'Success', chances: chances.map((c: bigint) => c.toString())}, heroId.toString(), 'Gym', undefined);
  },
});

/**
 * Handler pour Gym.UpgradeRequested
 * Événement de tracking - pas de mise à jour d'entité nécessaire
 */
Gym.UpgradeRequested.handlerWithLoader({
  loader: async ({ event, context }: { event: any; context: any }) => {
    // Pas de préchargement nécessaire pour un simple événement de tracking
    return {};
  },

  handler: async ({ event, context }: { event: any; context: any }) => {
    const { season, owner, heroId, levelUp, cost } = event.params;
    const timestamp = BigInt(event.block.timestamp);

    // Stocke l'événement brut
    await context.Gym_UpgradeRequested.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      season,
      owner,
      heroId,
      levelUp,
      cost,
    });

    // Note: On ne peut pas mettre à jour les stats par type ici car on ne sait pas encore quel type sera utilisé
    // Les stats par type seront mises à jour dans les handlers Upgraded
  },
}); 