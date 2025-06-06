/**
 * Parses a 32-bit metadata integer into weapon properties:
 *  - bits [0..7]   : rarity
 *  - bits [8..15]  : weaponType
 *  - bits [16..23] : maxSharpness
 *  - bits [24..31] : maxDurability
 *
 * @param metadata 32-bit metadata as bigint
 */
export function parseWeaponMetadata(metadata: bigint): {
  rarity: bigint;
  weaponType: bigint;
  maxSharpness: bigint;
  maxDurability: bigint;
} {
  const num = Number(metadata);
  const rarity = BigInt(num & 0xff);
  const weaponType = BigInt((num >> 8) & 0xff);
  const maxSharpness = BigInt((num >> 16) & 0xff);
  const maxDurability = BigInt((num >> 24) & 0xff);
  return { rarity, weaponType, maxSharpness, maxDurability };
} 