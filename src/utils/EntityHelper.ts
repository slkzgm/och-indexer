import type { Player_t, Hero_t, Weapon_t } from "../../generated/src/db/Entities.gen";

/**
 * Creates a default Player_t entity with all numeric fields initialized to zero.
 * @param id - Player ID (usually a wallet address)
 */
export function createDefaultPlayer(id: string): Player_t {
    return {
        id: id.toLowerCase(),
        trainingSpend: BigInt(0),
        claimedAmount: BigInt(0),
        repairSpend: BigInt(0),
        repairedTimes: 0,
        sharpenSpend: BigInt(0),
        sharpenedTimes: 0,
        bronzeGachaOpened: 0,
        silverGachaOpened: 0,
        goldGachaOpened: 0,
        rainbowGachaOpened: 0,
        weaponHeroMinted: 0,
        weaponHeroSpend: BigInt(0),
        weaponRemixerMinted: 0,
        weaponRemixerSpend: BigInt(0),
        weaponRemixerAmount: BigInt(0),
        weaponRemixerAmountSuccess: 0,
        weaponRemixerAmountFail: 0,
        weaponRemixerSuccess: 0,
        weaponRemixerFail: 0,
        weaponCommonRemixed: 0,
        weaponCommonRemixedSpend: BigInt(0),
        weaponCommonRemixedSuccess: 0,
        weaponCommonRemixedFail: 0,
        weaponUncommonRemixed: 0,
        weaponUncommonRemixedSpend: BigInt(0),
        weaponUncommonRemixedSuccess: 0,
        weaponUncommonRemixedFail: 0,
        weaponRareRemixed: 0,
        weaponRareRemixedSpend: BigInt(0),
        weaponRareRemixedSuccess: 0,
        weaponRareRemixedFail: 0,
        weaponEpicRemixed: 0,
        weaponEpicRemixedSpend: BigInt(0),
        weaponEpicRemixedSuccess: 0,
        weaponEpicRemixedFail: 0,
        weaponHeroicRemixed: 0,
        weaponHeroicRemixedSpend: BigInt(0),
        weaponHeroicRemixedSuccess: 0,
        weaponHeroicRemixedFail: 0,
        weaponLegendaryRemixed: 0,
        weaponLegendaryRemixedSpend: BigInt(0),
        weaponLegendaryRemixedSuccess: 0,
        weaponLegendaryRemixedFail: 0,
    } as Player_t;
}

/**
 * Creates a default Hero_t entity with all numeric fields initialized to zero.
 * @param id - Hero ID (token ID as string)
 * @param player_id - Owner address
 */
export function createDefaultHero(id: string, player_id: string): Hero_t {
    return {
        id,
        player_id,
        level: 0,
        trainingSpend: BigInt(0),
        lastTrained: BigInt(0),
        claimedAmount: BigInt(0),
        stakedSince: undefined,
        lastClaimed: undefined,
        stakingType: undefined,
        weapon_id: undefined,
        damage: BigInt(0),
        bonusRewardPerDay: BigInt(0),
        dailyReward: BigInt(0),
        trainedTimes: 0,
    } as Hero_t;
}

/**
 * Creates a default Weapon_t entity with all numeric fields initialized to zero.
 * @param id - Weapon ID (token ID as string)
 * @param player_id - Owner address
 * @param hero_id - Equipped hero ID (empty string if none)
 */
export function createDefaultWeapon(id: string, player_id: string, hero_id: string = ""): Weapon_t {
    return {
        id,
        player_id,
        hero_id,
        rarity: BigInt(0),
        durability: BigInt(0),
        maxDurability: BigInt(0),
        sharpness: BigInt(0),
        maxSharpness: BigInt(0),
        weaponType: BigInt(0),
        repairSpend: BigInt(0),
        repairedTimes: 0,
        sharpenSpend: BigInt(0),
        sharpenedTimes: 0,
    } as Weapon_t;
} 