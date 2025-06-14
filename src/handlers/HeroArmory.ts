import { HeroArmory } from "generated";
import { getOrCreateGlobalStats, getOrCreatePlayer } from "../helpers";
import { handleEquip, handleUnequip } from "../helpers/armory";
import { WEAPON_RARITY_COUNT } from '../constants';
import { PlayerArmoryStatsByLevel, GlobalArmoryStatsByLevel, Hero } from "generated";

async function getHeroAndOwner(context: any, heroId: string): Promise<{hero?: Hero, ownerId?: string}> {
    const hero = await context.Hero.get(heroId);
    if (!hero) {
        context.log.error(`Hero with id ${heroId} not found.`);
        return {};
    }
    if (!hero.owner_id) {
        context.log.error(`Hero with id ${heroId} has no owner.`);
        return { hero };
    }
    return { hero, ownerId: hero.owner_id };
}

// =================================================================================================
// Handler for the Equipped event
// =================================================================================================

HeroArmory.Equipped.handler(async ({ event, context }) => {
    const heroId = event.params.heroId.toString();
    const weaponId = event.params.weaponId.toString();
    const hero = await context.Hero.get(heroId);
    if (!hero) { context.log.error(`Hero ${heroId} not found.`); return; }

    const ownerId = hero.owner_id;
    if (!ownerId) { context.log.error(`Hero ${heroId} has no owner.`); return; }
    const player = await getOrCreatePlayer(context, ownerId);
    const globalStats = await getOrCreateGlobalStats(context);
    const newWeapon = await context.Weapon.get(weaponId);
    if (!newWeapon) { context.log.error(`Weapon ${weaponId} not found.`); return; }

    if (hero.equippedWeapon_id && hero.equippedWeapon_id !== newWeapon.id) {
        const oldWeapon = await context.Weapon.get(hero.equippedWeapon_id);
        if (oldWeapon) await handleUnequip(context, hero, oldWeapon, player, globalStats);
    }

    await handleEquip(context, hero, newWeapon, player, globalStats);
});

// =================================================================================================
// Handler for the Unequipped event
// =================================================================================================

HeroArmory.Unequipped.handler(async ({ event, context }) => {
    const heroId = event.params.heroId.toString();
    const weaponId = event.params.weaponId.toString();
    const hero = await context.Hero.get(heroId);
    if (!hero) { context.log.error(`Hero ${heroId} not found.`); return; }

    const ownerId = hero.owner_id;
    if (!ownerId) { context.log.error(`Hero ${heroId} has no owner.`); return; }
    const player = await getOrCreatePlayer(context, ownerId);
    const globalStats = await getOrCreateGlobalStats(context);
    const weapon = await context.Weapon.get(weaponId);
    if (!weapon) { context.log.error(`Weapon ${weaponId} not found.`); return; }

    if (!hero.equippedWeapon_id || hero.equippedWeapon_id !== weapon.id) return;
    await handleUnequip(context, hero, weapon, player, globalStats);
}); 