// File: src/utils/TrainingHelper.ts

import type {
    Hero_t,
    Player_t,
    Training_t,
} from "../../generated/src/db/Entities.gen";
import type { TrainingType_t as TrainingTypeEnum } from "../../generated/src/db/Enums.gen";
import { computeRewards, computeDamage, computeUpgradeCost } from "./ComputationHelper";
import { createDefaultHero, getOrCreatePlayer } from "./EntityHelper";


/**
 * Processes a training event by:
 * 1. Ensuring the Player and Hero entities exist (creating minimal records if not).
 * 2. Calculating the cost in BigInt.
 * 3. Incrementing `trainingSpend` on both Hero and Player.
 * 4. Updating Hero's level and lastTrained.
 * 5. Inserting a Training record.
 *
 * @param context       The Envio handler context.
 * @param owner         Player's wallet address.
 * @param heroIdStr     Hero's ID as a string.
 * @param season        Season number (BigInt).
 * @param oldLevelNum   Hero's level before upgrade.
 * @param newLevelNum   Hero's level after upgrade.
 * @param trainingType  Type of training (NORMAL, CHAOS, UNKNOWN).
 * @param timestampBI   Block timestamp (BigInt).
 * @param chainIdBI     Chain ID (BigInt).
 * @param blockNumBI    Block number (BigInt).
 * @param logIndexBI    Log index (BigInt).
 * @param chances       Optional array of chance values for CHAOS/UNKNOWN.
 */
export async function processTraining(
    context: any,
    owner: string,
    heroIdStr: string,
    season: bigint,
    oldLevelNum: number,
    newLevelNum: number,
    trainingType: TrainingTypeEnum,
    timestampBI: bigint,
    chainIdBI: bigint,
    blockNumBI: bigint,
    logIndexBI: bigint,
    chances?: bigint[]
): Promise<void> {
    const player = await getOrCreatePlayer(owner, context);

    // --- Ensure Hero exists ---
    let hero = await context.Hero.get(heroIdStr);
    if (!hero) {
        const defaultHero = createDefaultHero(heroIdStr, owner);
        await context.Hero.set(defaultHero);
        hero = defaultHero;
    }

    // Hero and player are non-null from this point
    const currentHero = hero as Hero_t;
    const currentPlayer = player as Player_t;

    // --- Calculate cost ---
    const costBI = computeUpgradeCost(oldLevelNum);

    // --- Update Hero: increment `trainingSpend`, set new level ---
    // Only recalculate damage and rewards if the hero actually leveled up and has a weapon
    let newDamage = currentHero.damage;
    let newBonusRewardPerDay = currentHero.bonusRewardPerDay;
    let newDailyReward = currentHero.dailyReward;
    if (newLevelNum !== oldLevelNum && currentHero.weapon_id) {
        const weapon = await context.Weapon.get(currentHero.weapon_id);
        if (weapon) {
            newDamage = computeDamage(BigInt(newLevelNum), weapon.rarity);
            const { bonusHeroPerDay, dailyReward } = computeRewards(
                BigInt(newLevelNum),
                newDamage,
                weapon.sharpness,
                weapon.maxSharpness
            );
            newBonusRewardPerDay = bonusHeroPerDay;
            newDailyReward = dailyReward;
        }
    }
    const updatedHero = {
        ...currentHero,
        level: newLevelNum,
        trainingSpend: currentHero.trainingSpend + costBI,
        lastTrained: timestampBI,
        damage: newDamage,
        bonusRewardPerDay: newBonusRewardPerDay,
        dailyReward: newDailyReward,
        trainedTimes: (currentHero as any).trainedTimes + 1,
    } as any;
    await context.Hero.set(updatedHero);

    // --- Update Player: increment `trainingSpend` ---
    const updatedPlayer: Player_t = {
        ...currentPlayer,
        trainingSpend: currentPlayer.trainingSpend + costBI,
    };
    await context.Player.set(updatedPlayer);

    // --- Insert Training record ---
    const trainingId = `${chainIdBI}_${blockNumBI}_${logIndexBI}_training`;
    const trainingEntity: Training_t = {
        id: trainingId,
        hero_id: heroIdStr,
        player_id: player.id,
        trainingType,
        timestamp: timestampBI,
        result: newLevelNum - oldLevelNum,
        fromLevel: oldLevelNum,
        toLevel: newLevelNum,
        cost: costBI,
        season,
        chances: chances ?? [],
    };
    await context.Training.set(trainingEntity);
}
