// Adresse à partir de laquelle les NFT sont émis (mint).
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Address of the s2 contracts
export const ARMORY_CONTRACT = "0x036A2598A6752b4986a629964F428680F737DECD"; 
export const DRAGMA_UNDERLINGS_CONTRACT = "0xd6C4268BC7252eAd69Da0d801CbAD9508Fc58F85"

// Address of the S1 deprecated contracts
export const S1_LEVELING_CONTRACT = "0x06D7Ee1D50828Ca96e11890A1601f6fe61F1e584"
export const S1_ENDGAME_CONTRACT = "0xeEa334B302BD8b1b96D4EF73B8f4467a347dA6f0"

export const HERO_STAKING_CONTRACTS: string[] = (
  [
    DRAGMA_UNDERLINGS_CONTRACT,
    S1_ENDGAME_CONTRACT,
    S1_LEVELING_CONTRACT,
  ] as string[]
).map((addr) => addr.toLowerCase());

export const WEAPON_STAKING_CONTRACTS: string[] = (
  [
    ARMORY_CONTRACT,
  ] as string[]
).map((addr) => addr.toLowerCase());

// IDs for Gacha items (ERC1155)
export const BRONZE_GACHA_ID = 1n;
export const SILVER_GACHA_ID = 2n;
export const GOLD_GACHA_ID = 3n;
export const RAINBOW_GACHA_ID = 4n;

// Maximum level for Heroes and Weapons
export const MAX_LEVEL = 100;

// Level gain range for Chaos trainings
export const CHAOS_LEVEL_GAIN_MIN = -5;
export const CHAOS_LEVEL_GAIN_MAX = 5;
export const CHAOS_LEVEL_GAIN_RANGE_SIZE =
  CHAOS_LEVEL_GAIN_MAX - CHAOS_LEVEL_GAIN_MIN + 1;

// Level gain range for Unknown trainings
export const UNKNOWN_LEVEL_GAIN_MIN = -1;
export const UNKNOWN_LEVEL_GAIN_MAX = 3;
export const UNKNOWN_LEVEL_GAIN_RANGE_SIZE =
  UNKNOWN_LEVEL_GAIN_MAX - UNKNOWN_LEVEL_GAIN_MIN + 1;

// Size of the `chances` array for each training type
export const CHAOS_CHANCES_SIZE = 11;
export const UNKNOWN_CHANCES_SIZE = 5;

// Weapon Rarity: 0-6 (Common, Uncommon, Rare, Epic, Heroic, Legendary, Mythic)
export const WEAPON_RARITY_MIN = 0;
export const WEAPON_RARITY_MAX = 6;
export const WEAPON_RARITY_COUNT = WEAPON_RARITY_MAX - WEAPON_RARITY_MIN + 1;

// Weapon Sharpness: assumed 1-100
export const WEAPON_SHARPNESS_MIN = 1;
export const WEAPON_SHARPNESS_MAX = 100;
export const WEAPON_SHARPNESS_COUNT =
  WEAPON_SHARPNESS_MAX - WEAPON_SHARPNESS_MIN + 1;

// Weapon Remixer amount: 2-5
export const REMIXER_AMOUNT_MIN = 2;
export const REMIXER_AMOUNT_MAX = 5;
export const REMIXER_AMOUNT_COUNT = REMIXER_AMOUNT_MAX - REMIXER_AMOUNT_MIN + 1;