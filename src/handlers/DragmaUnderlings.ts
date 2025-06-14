import {
  DragmaUnderlings,
  DragmaUnderlings_Claimed,
  DragmaUnderlings_Staked,
  DragmaUnderlings_Unstaked,
  DragmaUnderlings_WeaponDurabilityUpdated,
  DragmaUnderlings_WeaponSharpnessUpdated,
} from "generated";
import { calculateUnstakeAvailable } from "../helpers/calculations";
import { updateWeaponAndHeroStats } from "../helpers/entities";

/**
 * Handler pour DragmaUnderlings.Staked
 * Stake un héro pour gagner des rewards
 */
DragmaUnderlings.Staked.handler(async ({ event, context }) => {
  const { user, heroId } = event.params;
  const timestamp = BigInt(event.block.timestamp);

  // Stocke l'événement brut
  const entity: DragmaUnderlings_Staked = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user,
    heroId,
  };

  // PARALLELISATION : Stockage event + récupération du héro
  const [, hero] = await Promise.all([
    context.DragmaUnderlings_Staked.set(entity),
    context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`),
  ]);

  // Met à jour le héro : staking activé
  const updatedHero = {
    ...hero,
    staked: true,
    stakingType: "DRAGMA_UNDERLINGS" as const,
    stakedTimestamp: timestamp,
    unstakeAvailableTimestamp: calculateUnstakeAvailable(timestamp),
    lastClaimTimestamp: timestamp, // Commence le compteur de rewards
  };

  context.Hero.set(updatedHero);
});

/**
 * Handler pour DragmaUnderlings.Unstaked
 * Unstake un héro (arrête les rewards)
 */
DragmaUnderlings.Unstaked.handler(async ({ event, context }) => {
  const { user, heroId } = event.params;

  // Stocke l'événement brut
  const entity: DragmaUnderlings_Unstaked = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user,
    heroId,
  };

  // PARALLELISATION : Stockage event + récupération du héro
  const [, hero] = await Promise.all([
    context.DragmaUnderlings_Unstaked.set(entity),
    context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`),
  ]);

  // Met à jour le héro : staking désactivé
  const updatedHero = {
    ...hero,
    staked: false,
    stakingType: undefined,
    stakedTimestamp: undefined,
    unstakeAvailableTimestamp: undefined,
    lastClaimTimestamp: undefined,
  };

  context.Hero.set(updatedHero);
});

/**
 * Handler pour DragmaUnderlings.Claimed
 * Claim les rewards d'un héro
 */
DragmaUnderlings.Claimed.handler(async ({ event, context }) => {
  const { user, heroId, amount } = event.params;
  const timestamp = BigInt(event.block.timestamp);

  // Stocke l'événement brut
  const entity: DragmaUnderlings_Claimed = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user,
    heroId,
    amount,
  };

  // PARALLELISATION : Stockage event + récupération du héro
  const [, hero] = await Promise.all([
    context.DragmaUnderlings_Claimed.set(entity),
    context.Hero.getOrThrow(heroId.toString(), `Hero ${heroId} non trouvé`),
  ]);

  // Met à jour le timestamp du dernier claim
  const updatedHero = {
    ...hero,
    lastClaimTimestamp: timestamp,
  };

  context.Hero.set(updatedHero);
});

/**
 * Handler pour DragmaUnderlings.WeaponDurabilityUpdated
 * Met à jour la durability d'une arme (peut la casser si durability = 0)
 */
DragmaUnderlings.WeaponDurabilityUpdated.handler(async ({ event, context }) => {
  const { user, weaponId, oldDurability, newDurability } = event.params;

  // Stocke l'événement brut
  const entity: DragmaUnderlings_WeaponDurabilityUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user,
    weaponId,
    oldDurability,
    newDurability,
  };

  // PARALLELISATION : Stockage event + récupération de l'arme
  const [, weapon] = await Promise.all([
    context.DragmaUnderlings_WeaponDurabilityUpdated.set(entity),
    context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`),
  ]);

  // Met à jour la durability (et broken si durability = 0)
  // Pas besoin de recalculer les stats car durability n'affecte pas les rewards
  await updateWeaponAndHeroStats(context, weapon, {
    durability: Number(newDurability),
  });
});

/**
 * Handler pour DragmaUnderlings.WeaponSharpnessUpdated
 * Met à jour la sharpness d'une arme (affecte les rewards du héro)
 */
DragmaUnderlings.WeaponSharpnessUpdated.handler(async ({ event, context }) => {
  const { user, weaponId, oldSharpness, newSharpness } = event.params;

  // Stocke l'événement brut
  const entity: DragmaUnderlings_WeaponSharpnessUpdated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    user,
    weaponId,
    oldSharpness,
    newSharpness,
  };

  // PARALLELISATION : Stockage event + récupération de l'arme
  const [, weapon] = await Promise.all([
    context.DragmaUnderlings_WeaponSharpnessUpdated.set(entity),
    context.Weapon.getOrThrow(weaponId.toString(), `Weapon ${weaponId} non trouvée`),
  ]);

  // Met à jour la sharpness ET recalcule les rewards car sharpness affecte le bonus
  await updateWeaponAndHeroStats(context, weapon, {
    sharpness: Number(newSharpness),
  });
}); 