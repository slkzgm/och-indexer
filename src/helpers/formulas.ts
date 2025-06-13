/**
 * Computes the exact upgrade cost based on the on-chain formula:
 *   cost = (level * 10000e18) / (69 + level)
 *
 * All operations use BigInt to avoid precision loss.
 */
export function getTrainingCost(level: bigint): bigint {
  // TODO: Implement actual training cost formula
  return level * 100n;
}

export function parseWeaponMetadata(metadata: bigint): {
  weaponType: number;
  rarity: number;
  maxDurability: bigint;
  maxSharpness: bigint;
} {
  // TODO: Implement actual metadata parsing logic based on contract
  // This is a placeholder implementation
  const weaponType = Number((metadata >> 248n) & 0xffn);
  const rarity = Number((metadata >> 240n) & 0xffn);
  const maxDurability = (metadata >> 120n) & 0xffffffffffffn;
  const maxSharpness = metadata & 0xffffffffffffn;

  return { weaponType, rarity, maxDurability, maxSharpness };
}