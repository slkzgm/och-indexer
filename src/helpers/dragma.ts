// src/helpers/dragma.ts

/**
 * Maps token IDs to reward types for each Dragma zone
 * Structure: [zone][tokenId] = rewardType (0=primary, 1=secondary1, 2=secondary2, 3=secondary3, 4=tertiary)
 */
const DRAGMA_ZONE_REWARD_MAPPING: Record<number, Record<number, number>> = {
  // Zone 0: Tails
  0: {
    18: 0, // Dragma Tail (Primary)
    6: 1,  // Dragma Balls (Secondary 1)
    7: 2,  // Obsidian (Secondary 2)
    8: 3,  // Ashes (Secondary 3)
    5: 4,  // Dragmite Ore (Tertiary)
  },
  // Zone 1: Legs
  1: {
    19: 0, // Dragma Plate (Primary)
    9: 1,  // Dragma Claw (Secondary 1)
    10: 2, // Magma Shell (Secondary 2)
    11: 3, // Magma Goop (Secondary 3)
    5: 4,  // Dragmite Ore (Tertiary)
  },
  // Zone 2: Torso
  2: {
    20: 0, // Dragma Core (Primary)
    12: 1, // Dragma Chunk (Secondary 1)
    13: 2, // World Boss Shard (Secondary 2)
    14: 3, // Magma Leather (Secondary 3)
    5: 4,  // Dragmite Ore (Tertiary)
  },
  // Zone 3: Head
  3: {
    21: 0, // World Boss Soul (Primary)
    15: 1, // Dragma Lens (Secondary 1)
    16: 2, // Dragma Essence (Secondary 2)
    17: 3, // Dragma Horn (Secondary 3)
    5: 4,  // Dragmite Ore (Tertiary)
  },
};

/**
 * Maps a token ID to its reward type for a specific zone
 * @param zone Zone number (0-3)
 * @param tokenId Token ID from the event
 * @returns Reward type (0=primary, 1=secondary1, 2=secondary2, 3=secondary3, 4=tertiary), or -1 if not found
 */
export function getRewardTypeForToken(zone: number, tokenId: number): number {
  const zoneMapping = DRAGMA_ZONE_REWARD_MAPPING[zone];
  if (!zoneMapping) {
    console.warn(`No mapping found for zone ${zone}`);
    return -1;
  }
  
  const rewardType = zoneMapping[tokenId];
  if (rewardType === undefined) {
    console.warn(`No mapping found for tokenId ${tokenId} in zone ${zone}`);
    return -1;
  }
  
  return rewardType;
}

/**
 * Updates rewards per zone based on token IDs
 * @param rewardsPerZone Current rewards array
 * @param zone Zone number (0-3)
 * @param tokenIds Array of token IDs from the event
 * @returns Updated rewards array
 */
export function updateRewardsPerZone(
  rewardsPerZone: number[][],
  zone: number,
  tokenIds: bigint[]
): number[][] {
  if (zone < 0 || zone >= rewardsPerZone.length) {
    console.warn(`Invalid zone ${zone}`);
    return rewardsPerZone;
  }
  
  const updatedRewards = rewardsPerZone.map((zoneRewards, zoneIndex) => {
    if (zoneIndex !== zone) {
      return zoneRewards;
    }
    
    const newZoneRewards = [...zoneRewards];
    
    // Count each token ID and map to reward type
    for (const tokenId of tokenIds) {
      const rewardType = getRewardTypeForToken(zone, Number(tokenId));
      if (rewardType >= 0 && rewardType < newZoneRewards.length) {
        newZoneRewards[rewardType]++;
      }
    }
    
    return newZoneRewards;
  });
  
  return updatedRewards;
}

/**
 * Gets the zone name for a given zone number
 * @param zone Zone number (0-3)
 * @returns Zone name
 */
export function getZoneName(zone: number): string {
  const zoneNames = ['Tails', 'Legs', 'Torso', 'Head'];
  return zoneNames[zone] || `Zone ${zone}`;
}

/**
 * Gets the staking type for a given zone
 * @param zone Zone number (0-3)
 * @returns Staking type string
 */
export function getStakingTypeForZone(zone: number): string {
  const stakingTypes = ['DRAGMA_TAILS', 'DRAGMA_LEGS', 'DRAGMA_TORSO', 'DRAGMA_HEAD'];
  return stakingTypes[zone] || `DRAGMA_ZONE_${zone}`;
} 