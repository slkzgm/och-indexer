import {
  HeroArmory,
  HeroArmory_Equipped,
  HeroArmory_Unequipped,
} from "../../generated";
import { computeRewards, computeDamage } from "../utils/ComputationHelper";
import type { Hero_t, Weapon_t } from "../../generated/src/db/Entities.gen";

/**
 * Handler for HeroArmory.Equipped events.
 */
HeroArmory.Equipped.handler(async ({ event, context }: any) => {
  const entity: HeroArmory_Equipped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    heroId: event.params.heroId,
    weaponId: event.params.weaponId,
  };

  await context.HeroArmory_Equipped.set(entity);

  // Equip logic: update Hero stats based on weapon
  const heroIdStr = event.params.heroId.toString();
  const weaponIdStr = event.params.weaponId.toString();
  const hero: Hero_t | undefined = await context.Hero.get(heroIdStr);
  if (!hero) {
    console.warn(`Hero not found for equip: ${heroIdStr}, skipping stats update`);
    return;
  }
  const weapon: Weapon_t | undefined = await context.Weapon.get(weaponIdStr);
  if (!weapon) {
    console.warn(`Weapon not found for equip: ${weaponIdStr}, skipping stats update`);
    return;
  }
  // Compute damage based on hero level and weapon rarity
  const damageBI = computeDamage(BigInt(hero.level), weapon.rarity);
  const { bonusHeroPerDay: bonusRewardPerDay, dailyReward } = computeRewards(
    BigInt(hero.level),
    damageBI,
    weapon.sharpness,
    weapon.maxSharpness
  );
  const updatedHero: Hero_t = {
    ...hero,
    weapon_id: weaponIdStr,
    damage: damageBI,
    bonusRewardPerDay,
    dailyReward,
  };
  await context.Hero.set(updatedHero);

  // Also update Weapon entity to reflect equipped hero
  const updatedWeapon: Weapon_t = {
    ...weapon,
    hero_id: heroIdStr,
  };
  await context.Weapon.set(updatedWeapon);
});

/**
 * Handler for HeroArmory.Unequipped events.
 */
HeroArmory.Unequipped.handler(async ({ event, context }: any) => {
  const entity: HeroArmory_Unequipped = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    heroId: event.params.heroId,
    weaponId: event.params.weaponId,
  };

  await context.HeroArmory_Unequipped.set(entity);

  // Unequip logic: reset Hero weapon and stats
  const heroIdStr = event.params.heroId.toString();
  const hero: Hero_t | undefined = await context.Hero.get(heroIdStr);
  if (!hero) return;
  const updatedHero: Hero_t = {
    ...hero,
    weapon_id: undefined,
    damage: BigInt(0),
    bonusRewardPerDay: BigInt(0),
    dailyReward: BigInt(0),
  };
  await context.Hero.set(updatedHero);

  // Also update Weapon entity to clear equipped hero
  const weaponIdStr = event.params.weaponId.toString();
  const weaponToUpdate: Weapon_t | undefined = await context.Weapon.get(weaponIdStr);
  if (weaponToUpdate) {
    const clearedWeapon: Weapon_t = {
      ...weaponToUpdate,
      hero_id: "",
    };
    await context.Weapon.set(clearedWeapon);
  }
}); 