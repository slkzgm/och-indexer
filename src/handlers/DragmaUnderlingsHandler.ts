// File: src/handlers/DragmaUnderlingsHandler.ts

import {
    DragmaUnderlings,
    DragmaUnderlings_Claimed,
    DragmaUnderlings_Staked,
    DragmaUnderlings_Unstaked,
    DragmaUnderlings_Upgraded,
    DragmaUnderlings_WeaponDurabilityUpdated,
    DragmaUnderlings_WeaponSharpnessUpdated,
} from "generated";
import type { Hero_t, Player_t } from "generated/src/db/Entities.gen";

/**
 * Handler for DragmaUnderlings.Staked events.
 * - Sets hero.stakedSince = block.timestamp
 * - Sets hero.stakingType = "DRAGMA_UNDERLINGS"
 * - Persists the raw DragmaUnderlings_Staked event.
 */
DragmaUnderlings.Staked.handler(async ({ event, context }) => {
    const user = event.params.user;
    const heroIdBI = event.params.heroId;
    const heroIdStr = heroIdBI.toString();
    const timestampBI = BigInt(event.block.timestamp);
    const chainIdBI = BigInt(event.chainId);
    const blockNumBI = BigInt(event.block.number);
    const logIndexBI = BigInt(event.logIndex);

    // Load existing Hero (returns Hero_t | undefined)
    let existingHero: Hero_t | undefined = await context.Hero.get(heroIdStr);
    let heroToSave: Hero_t;

    if (existingHero) {
        // Update staking fields on existing Hero
        heroToSave = {
            ...existingHero,
            stakedSince: timestampBI,
            stakingType: "DRAGMA_UNDERLINGS",
        };
    } else {
        // Create minimal Hero record if none exists
        heroToSave = {
            id: heroIdStr,
            player_id: user,
            level: 0,
            trainingSpend: BigInt(0),
            lastTrained: BigInt(0),
            claimedAmount: BigInt(0),
            stakedSince: timestampBI,
            lastClaimed: undefined,
            stakingType: "DRAGMA_UNDERLINGS",
        };
    }
    await context.Hero.set(heroToSave);

    // Persist raw event
    const stakedEvent: DragmaUnderlings_Staked = {
        id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
        user,
        heroId: heroIdBI,
    };
    await context.DragmaUnderlings_Staked.set(stakedEvent);
});

/**
 * Handler for DragmaUnderlings.Unstaked events.
 * - Clears hero.stakedSince and hero.stakingType
 * - Persists the raw DragmaUnderlings_Unstaked event.
 */
DragmaUnderlings.Unstaked.handler(async ({ event, context }) => {
    const user = event.params.user;
    const heroIdBI = event.params.heroId;
    const heroIdStr = heroIdBI.toString();
    const chainIdBI = BigInt(event.chainId);
    const blockNumBI = BigInt(event.block.number);
    const logIndexBI = BigInt(event.logIndex);

    // Load existing Hero
    const existingHero: Hero_t | undefined = await context.Hero.get(heroIdStr);
    if (existingHero) {
        const updatedHero: Hero_t = {
            ...existingHero,
            stakedSince: undefined,
            stakingType: undefined,
        };
        await context.Hero.set(updatedHero);
    }

    // Persist raw event
    const unstakedEvent: DragmaUnderlings_Unstaked = {
        id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
        user,
        heroId: heroIdBI,
    };
    await context.DragmaUnderlings_Unstaked.set(unstakedEvent);
});

/**
 * Handler for DragmaUnderlings.Claimed events.
 * - Updates hero.lastClaimed = block.timestamp
 * - Increments hero.claimedAmount by amount
 * - Increments player.claimedAmount by amount
 * - Persists the raw DragmaUnderlings_Claimed event.
 */
DragmaUnderlings.Claimed.handler(async ({ event, context }) => {
    const user = event.params.user;
    const heroIdBI = event.params.heroId;
    const amountBI = event.params.amount;
    const heroIdStr = heroIdBI.toString();
    const timestampBI = BigInt(event.block.timestamp);
    const chainIdBI = BigInt(event.chainId);
    const blockNumBI = BigInt(event.block.number);
    const logIndexBI = BigInt(event.logIndex);

    // Load and update Hero
    let hero: Hero_t | undefined = await context.Hero.get(heroIdStr);
    if (hero) {
        const updatedHero: Hero_t = {
            ...hero,
            claimedAmount: hero.claimedAmount + amountBI,
            lastClaimed: timestampBI,
        };
        await context.Hero.set(updatedHero);
    } else {
        // Create minimal Hero if not exists
        const newHero: Hero_t = {
            id: heroIdStr,
            player_id: user,
            level: 0,
            trainingSpend: BigInt(0),
            lastTrained: BigInt(0),
            claimedAmount: amountBI,
            stakedSince: undefined,
            lastClaimed: timestampBI,
            stakingType: undefined,
        };
        await context.Hero.set(newHero);
    }

    // Load and update Player
    let player: Player_t | undefined = await context.Player.get(user);
    if (player) {
        const updatedPlayer: Player_t = {
            ...player,
            claimedAmount: player.claimedAmount + amountBI,
        };
        await context.Player.set(updatedPlayer);
    } else {
        const newPlayer: Player_t = {
            id: user,
            trainingSpend: BigInt(0),
            claimedAmount: amountBI,
        };
        await context.Player.set(newPlayer);
    }

    // Persist raw event
    const claimedEvent: DragmaUnderlings_Claimed = {
        id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
        user,
        heroId: heroIdBI,
        amount: amountBI,
    };
    await context.DragmaUnderlings_Claimed.set(claimedEvent);
});

/**
 * Handler for DragmaUnderlings.Upgraded events.
 * - Persists the raw DragmaUnderlings_Upgraded event.
 */
DragmaUnderlings.Upgraded.handler(async ({ event, context }) => {
    const chainIdBI = BigInt(event.chainId);
    const blockNumBI = BigInt(event.block.number);
    const logIndexBI = BigInt(event.logIndex);

    const upgradedEvent: DragmaUnderlings_Upgraded = {
        id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
        implementation: event.params.implementation,
    };
    await context.DragmaUnderlings_Upgraded.set(upgradedEvent);
});

/**
 * Handler for DragmaUnderlings.WeaponDurabilityUpdated events.
 * - Persists the raw DragmaUnderlings_WeaponDurabilityUpdated event.
 */
DragmaUnderlings.WeaponDurabilityUpdated.handler(async ({ event, context }) => {
    const chainIdBI = BigInt(event.chainId);
    const blockNumBI = BigInt(event.block.number);
    const logIndexBI = BigInt(event.logIndex);

    const durabilityEvent: DragmaUnderlings_WeaponDurabilityUpdated = {
        id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
        user: event.params.user,
        weaponId: event.params.weaponId,
        oldDurability: event.params.oldDurability,
        newDurability: event.params.newDurability,
    };
    await context.DragmaUnderlings_WeaponDurabilityUpdated.set(durabilityEvent);
});

/**
 * Handler for DragmaUnderlings.WeaponSharpnessUpdated events.
 * - Persists the raw DragmaUnderlings_WeaponSharpnessUpdated event.
 */
DragmaUnderlings.WeaponSharpnessUpdated.handler(async ({ event, context }) => {
    const chainIdBI = BigInt(event.chainId);
    const blockNumBI = BigInt(event.block.number);
    const logIndexBI = BigInt(event.logIndex);

    const sharpnessEvent: DragmaUnderlings_WeaponSharpnessUpdated = {
        id: `${chainIdBI}_${blockNumBI}_${logIndexBI}`,
        user: event.params.user,
        weaponId: event.params.weaponId,
        oldSharpness: event.params.oldSharpness,
        newSharpness: event.params.newSharpness,
    };
    await context.DragmaUnderlings_WeaponSharpnessUpdated.set(sharpnessEvent);
});
