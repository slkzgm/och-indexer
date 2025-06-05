// File: src/utils/TrainingHelper.ts

import type {
    Hero_t,
    Player_t,
    Training_t,
} from "generated/src/db/Entities.gen";
import type { TrainingType_t as TrainingTypeEnum } from "generated/src/db/Enums.gen";
import { TrainingType } from "generated";

/**
 * Computes the exact upgrade cost based on the on-chain formula:
 *   cost = (level * 10000e18) / (69 + level)
 *
 * All operations use BigInt to avoid precision loss.
 */
function computeUpgradeCost(currentLevel: number): bigint {
    const lvl = BigInt(currentLevel);
    // 10000e18 = 10^4 * 10^18 = 10^22
    const SCALE = BigInt("10000000000000000000000");
    const numerator = lvl * SCALE;
    const denominator = BigInt(69 + currentLevel);
    return numerator / denominator;
}

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
    // --- Ensure Player exists ---
    let player = await context.Player.get(owner);
    if (!player) {
        const newPlayer: Player_t = {
            id: owner,
            trainingSpend: BigInt(0),
            claimedAmount: BigInt(0),
        };
        await context.Player.set(newPlayer);
        player = newPlayer;
    }

    // --- Ensure Hero exists ---
    let hero = await context.Hero.get(heroIdStr);
    if (!hero) {
        const newHero: Hero_t = {
            id: heroIdStr,
            player_id: owner,
            level: newLevelNum,
            trainingSpend: BigInt(0),
            lastTrained: timestampBI,
            claimedAmount: BigInt(0),
            stakedSince: undefined,
            lastClaimed: undefined,
            stakingType: undefined,
        };
        await context.Hero.set(newHero);
        hero = newHero;
    }

    // Hero and player are non-null from this point
    const currentHero = hero as Hero_t;
    const currentPlayer = player as Player_t;

    // --- Calculate cost ---
    const costBI = computeUpgradeCost(oldLevelNum);

    // --- Update Hero: increment `trainingSpend`, set new level & lastTrained ---
    const updatedHero: Hero_t = {
        id: currentHero.id,
        player_id: currentHero.player_id,
        level: newLevelNum,
        trainingSpend: currentHero.trainingSpend + costBI,
        lastTrained: timestampBI,
        claimedAmount: currentHero.claimedAmount,
        stakedSince: currentHero.stakedSince,
        lastClaimed: currentHero.lastClaimed,
        stakingType: currentHero.stakingType,
    };
    await context.Hero.set(updatedHero);

    // --- Update Player: increment `trainingSpend` ---
    const updatedPlayer: Player_t = {
        id: currentPlayer.id,
        trainingSpend: currentPlayer.trainingSpend + costBI,
        claimedAmount: currentPlayer.claimedAmount,
    };
    await context.Player.set(updatedPlayer);

    // --- Insert Training record ---
    const trainingId = `${chainIdBI}_${blockNumBI}_${logIndexBI}_training`;
    const trainingEntity: Training_t = {
        id: trainingId,
        hero_id: heroIdStr,
        player_id: owner,
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
