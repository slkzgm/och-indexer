# OCH Season 2 Indexer Documentation

## Overview

This subgraph indexes events from the OnChain Heroes Season 2 game, tracking heroes, weapons, staking, training, fishing, and remix mechanics. It provides comprehensive analytics and activity tracking for the game ecosystem.

## Game Mechanics

### Training System
- **Cooldown**: 11h45 between training sessions (11 * 60 * 60 + 45 * 60 seconds)
- **Cost Formula**: `(Level * 10000e18) / (69 + Level)`
- **Types**: NORMAL, CHAOS, UNKNOWN
- **Outcomes**: Level increase (-5 to +5 levels per training for Chaos, 0-2 for others)

### Staking System
- **Dragma Underlings**: 6-hour unstake cooldown
- **Fishing**: 11h45 unstake cooldown
- **Dragma**: 11h45 unstake cooldown
- **Rewards**: Based on hero level and weapon sharpness
- **Fishing Zones**: SLIME_BAY(0), SHROOM_GROTTO(1), SKEET_PIER(2), MAGMA_MIRE(3)
- **Dragma Zones**: TAILS(0), LEGS(1), TORSO(2), HEAD(3)

### Weapon System
- **Rarities**: COMMON(0) to MYTHIC(6)
- **Coefficients**: [1,2,3,5,8,13,21] for damage calculation
- **Sharpness**: Affects reward bonus (0-20%)
- **Durability**: Affects weapon usage

### Remix System
- **Weapons**: 2-5 weapons can be combined
- **Outcomes**: FAIL(+0), SUCCESS(+1), PERFECT(+2)
- **Legendary**: Special remix with 3 legendary weapons

### Death & Revival System
- **Death**: Heroes can die in Fishing and Dragma contracts
- **Revival**: Heroes can be revived for a cost
- **Impact**: Dead heroes cannot be staked or trained until revived
- **Tracking**: Separate death/revival counts per contract

### Reward Calculation System
- **Damage Formula**: `level * weaponCoefficient[rarity]`
- **Max Rewards**: `(Damage × 400 × 1e18) / (20 + Hero Level)`
- **Base Rewards**: 80% of max rewards (guaranteed)
- **Sharpness Bonus**: 20% of max rewards, scaled by sharpness ratio
- **Effective Rewards**: Base + Bonus + 50 wei fixed bonus
- **Hourly Rates**: Daily rewards divided by 24

## Core Entities

### Player
Represents a game user and their overall stats.

```graphql
type Player @entity {
  id: Bytes! # Player's wallet address (lowercase)
  balance: BigInt! # Player's token balance (in wei)
  heroCount: Int! # Total number of heroes owned
  weaponCount: Int! # Total number of weapons owned
  stakedHeroCount: Int! # Number of currently staked heroes
  heroesByLevel: [Int!]! # Distribution by level (0-100, 101 elements)
  gachaBalances: [BigInt!]! # [bronze, silver, gold, rainbow] - fixed order
  itemsBalances: [BigInt!]! # Game items balances [tokenId1, tokenId2, ..., tokenId21]
  totalSpent: BigInt! # Total spent across all game activities (training, fishing, remix, etc.)
}
```

**Field Details:**
- `id`: Player's wallet address normalized to lowercase
- `balance`: Current token balance in wei (1e18 precision)
- `heroCount`: Total heroes owned (updated on mint/transfer)
- `weaponCount`: Total weapons owned (updated on mint/transfer)
- `stakedHeroCount`: Currently staked heroes across all staking types
- `heroesByLevel`: Array of 101 elements tracking hero distribution by level (0-100)
- `gachaBalances`: Fixed 4-element array for gacha token balances [bronze, silver, gold, rainbow]
- `itemsBalances`: Fixed 21-element array for game item balances [tokenId1, tokenId2, ..., tokenId21]
- `totalSpent`: Total spent across all game activities (training, fishing, remix, etc.)

### Hero
Represents a playable character NFT with progression and staking capabilities.

```graphql
type Hero @entity {
  id: String! # Hero token ID
  owner: Player! # Player who owns this hero
  minter: Bytes! # Address that minted this hero
  mintedTimestamp: BigInt! # When this hero was minted
  
  # Character progression
  level: Int! # Current hero level (1-100)
  lastTrainingTimestamp: BigInt! # Last time hero was trained
  nextTrainingCost: BigInt! # Cost for next training session (calculated using formula)
  nextTrainingAvailable: BigInt! # When next training is available (11h45 cooldown)
  revealed: Boolean! # Whether hero attributes are revealed
  
  # Equipment and combat stats
  equippedWeapon: Weapon @oneToOne # Currently equipped weapon
  damage: BigInt! # Total damage output
  
  # Rewards calculation system (all values in wei - 1e18)
  maxHeroPerDay: BigInt! # Maximum possible rewards per day
  baseHeroPerDay: BigInt! # Guaranteed 80% of max rewards
  bonusHeroPerDay: BigInt! # Current sharpness bonus (0-20% of max)
  effectiveHeroPerDay: BigInt! # Total daily rewards (base + bonus + 50)
  maxHeroPerHour: BigInt! # maxHeroPerDay / 24
  effectiveHeroPerHour: BigInt! # effectiveHeroPerDay / 24
  
  # Staking system
  staked: Boolean! # Whether hero is currently staked
  stakingType: StakingType # Type of staking (fishing, dragma, etc.)
  stakedTimestamp: BigInt! # When hero was staked
  unstakeAvailableTimestamp: BigInt! # When hero can be unstaked (cooldown: 6h for DragmaUnderlings, 11h45 for Fishing/Dragma)
  lastClaimTimestamp: BigInt! # Last time rewards were claimed
  totalRewardsClaimed: BigInt! # Total rewards claimed for this hero
  totalStakingDuration: BigInt! # Total staking duration in seconds (cumulative)
  totalStakes: Int! # Total number of stakes for this hero
  totalUnstakes: Int! # Total number of unstakes
  totalClaims: Int! # Total number of claims
  
  # Fishing-specific stats
  totalFishingFees: BigInt! # Total fees paid for fishing
  totalFishingRewards: BigInt! # Total rewards earned from fishing
  fishingRewardsPerZone: [BigInt!]! # [SLIME_BAY, SHROOM_GROTTO, SKEET_PIER, MAGMA_MIRE]
  totalFishingShards: Int! # Total weapon shards won
  fishingShardsPerZone: [Int!]! # Shards won per zone
  totalFishingBonuses: Int! # Total bonus items won
  fishingBonusesPerZone: [Int!]! # Bonuses won per zone
  totalFishingSessions: Int! # Total fishing sessions
  fishingSessionsPerZone: [Int!]! # Sessions per zone
  
  # Death and revival system
  isDead: Boolean! # Whether hero is currently dead (prevents staking/training)
  deathLocation: DeathLocation # Contract where hero died (FISHING, DRAGMA, or null if alive/revived)
  deathsCount: Int! # Total number of deaths
  revivalCount: Int! # Total number of revivals
  spentOnRevive: BigInt! # Total cost spent on revivals
  
  # Training stats
  totalAttemptedTrainings: Int! # Total training attempts
  totalSuccessfulTrainings: Int! # Total successful trainings
  totalFailedTrainings: Int! # Total failed trainings
  attemptedByType: [Int!]! # [NORMAL, CHAOS, UNKNOWN]
  successfulByType: [Int!]! # [NORMAL, CHAOS, UNKNOWN]
  failedByType: [Int!]! # [NORMAL, CHAOS, UNKNOWN]
  totalOutcomeSumByType: [BigInt!]! # Sum of outcomes by type
  outcomesCountByType: [[Int!]!]! # Detailed outcome counts by type
  sumOfChancesByType: [[BigInt!]!]! # Sum of chances by type
  chancesCountByType: [Int!]! # Number of chance records by type
  totalSpent: BigInt! # Total cost spent on training
  spentByType: [BigInt!]! # Costs by training type
  totalTrainingCost: BigInt! # Total training cost
  trainingCostByType: [BigInt!]! # Training costs by type
}
```

**Field Details:**
- `level`: Hero level (1-100), affects training cost and rewards
- `lastTrainingTimestamp`: Unix timestamp of last training
- `nextTrainingCost`: Calculated using formula: `(Level * 10000e18) / (69 + Level)`
- `nextTrainingAvailable`: `lastTrainingTimestamp + 11h45` (training cooldown)
- `damage`: Calculated as `level * weaponCoefficient[rarity]`
- `maxHeroPerDay`: Base rewards based on level and weapon rarity
- `baseHeroPerDay`: 80% of maxHeroPerDay (guaranteed)
- `bonusHeroPerDay`: Sharpness bonus (0-20% of max)
- `effectiveHeroPerDay`: Total daily rewards including base 50 wei bonus
- `staked`: Boolean indicating if hero is currently staked
- `stakingType`: Type of staking (DRAGMA_UNDERLINGS, FISHING_*, DRAGMA_*)
- `unstakeAvailableTimestamp`: `stakedTimestamp + cooldown` (6h for DragmaUnderlings, 11h45 for Fishing/Dragma)
- `totalStakingDuration`: Cumulative staking time in seconds
- `fishingRewardsPerZone`: Array tracking rewards per fishing zone [SLIME_BAY(0), SHROOM_GROTTO(1), SKEET_PIER(2), MAGMA_MIRE(3)]
- `isDead`: Boolean indicating if hero is currently dead (prevents staking/training)
- `deathLocation`: Contract where hero died (FISHING, DRAGMA, or null if alive/revived)
- `deathsCount`: Total number of times hero has died
- `revivalCount`: Total number of times hero has been revived
- `spentOnRevive`: Total cost spent on reviving this hero
- **Note**: When a hero dies, `staked` is set to `false` and `stakingType` is reset to `undefined`. After revival, the hero remains unstaked and must be manually restaked.
- `fishingDeathCount`: Total number of deaths in fishing
- `fishingRevivalCount`: Total number of revivals in fishing
- `fishingReviveSpent`: Total cost spent on fishing revivals
- `fishingDeathPerZone`: Array [SLIME_BAY, SHROOM_GROTTO, SKEET_PIER, MAGMA_MIRE] tracking deaths by zone
- `dragmaDeathCount`: Total number of deaths in dragma
- `dragmaRevivalCount`: Total number of revivals in dragma
- `dragmaReviveSpent`: Total cost spent on dragma revivals
- `dragmaDeathPerZone`: Array [TAILS, LEGS, TORSO, HEAD] tracking deaths by zone
- `trainingCostByType`: Array tracking costs per training type [NORMAL, CHAOS, UNKNOWN]

### Weapon
Represents a weapon NFT with attributes and source tracking.

```graphql
type Weapon @entity {
  id: String! # Weapon token ID
  owner: Player! # Player who owns this weapon
  source: WeaponSource! # How this weapon was obtained
  rarity: Int! # 0=COMMON, 1=UNCOMMON, 2=RARE, 3=EPIC, 4=HEROIC, 5=LEGENDARY, 6=MYTHIC
  minter: Bytes! # Address that minted this weapon
  mintedTimestamp: BigInt! # When this weapon was minted
  
  # Equipment status
  equipped: Boolean! # Whether weapon is currently equipped
  equippedHeroId: String # ID of hero that has this weapon equipped
  
  # Weapon attributes
  weaponType: Int! # Type/category of weapon
  sharpness: Int! # Current sharpness level (affects damage)
  maxSharpness: Int! # Maximum sharpness this weapon can achieve
  durability: Int! # Current durability (affects usage)
  maxDurability: Int! # Maximum durability this weapon can have
  broken: Boolean! # Whether weapon is broken (0 durability)
  
  # Source tracking for analytics
  requestId: String # Link to WeaponRequest
  sourceGachaTokenId: BigInt # Gacha token ID used if source = GACHA_MACHINE
  sourceHeroCost: BigInt # Cost paid if source = HERO_MACHINE
  sourceRemixedWeaponIds: [BigInt!] # IDs of weapons consumed if source = REMIXER
  sourceRemixRarity: Int # Target rarity if source = REMIXER
  sourceRemixType: RemixType # Type of remix if source = REMIXER
}
```

**Field Details:**
- `rarity`: Weapon rarity (0-6) affects damage coefficient [1,2,3,5,8,13,21]
- `sharpness`: Current sharpness (0-maxSharpness), affects reward bonus
- `maxSharpness`: Maximum sharpness this weapon can achieve
- `durability`: Current durability (0-maxDurability), affects usage
- `maxDurability`: Maximum durability this weapon can have
- `broken`: Boolean indicating if weapon has 0 durability
- `source`: How weapon was obtained (GACHA_MACHINE, HERO_MACHINE, REMIXER, DIRECT_MINT)
- `sourceGachaTokenId`: Links to gacha token used for generation
- `sourceHeroCost`: Cost paid for hero machine generation
- `sourceRemixedWeaponIds`: Array of weapon IDs consumed in remix
- `sourceRemixRarity`: Target rarity for remix operation
- `sourceRemixType`: Type of remix (NORMAL, LEGENDARY)
- `equippedHeroId`: ID of hero that has this weapon equipped (null if not equipped)

### WeaponRequest
Tracks asynchronous weapon generation requests.

```graphql
type WeaponRequest @entity {
  id: String! # Request ID from blockchain event
  source: WeaponSource! # Where this weapon request originated
  requester: Bytes! # Address that made the request
  timestamp: BigInt! # When request was made
  expectedWeapons: Int! # Number of weapons expected to be generated
  generatedWeapons: Int! # Counter of weapons actually generated
  completed: Boolean! # Whether request is fully completed
  
  # Gacha machine specific fields
  gachaTokenId: BigInt # Gacha token ID used
  gachaQty: Int # Quantity requested from gacha
  
  # Hero machine specific fields
  heroSlot: BigInt # Equipment slot for hero machine
  heroQty: Int # Quantity requested from hero machine
  heroCost: BigInt # Total cost paid
  heroCostPerWeapon: BigInt # Calculated cost per weapon
  
  # Remixer specific fields
  remixedWeaponIds: [BigInt!] # IDs of weapons that were burned/consumed
  remixRarity: Int # Target rarity for remix
  remixType: RemixType # Type of remix (normal/legendary)
  remixCost: BigInt # Cost for remix requests
  
  # Relations
  generatedWeaponIds: [String!]! # IDs of weapons generated from this request
}
```

**Field Details:**
- `source`: Origin of the request (GACHA_MACHINE, HERO_MACHINE, REMIXER)
- `expectedWeapons`: Number of weapons expected from this request
- `generatedWeapons`: Counter of weapons actually generated
- `completed`: Boolean indicating if all expected weapons were generated
- `gachaTokenId`: Links to specific gacha token used
- `heroSlot`: Equipment slot for hero machine requests
- `heroCostPerWeapon`: Calculated as `heroCost / heroQty`
- `remixedWeaponIds`: Array of weapon IDs consumed in remix
- `remixRarity`: Target rarity for remix operation
- `remixType`: Type of remix (NORMAL, LEGENDARY)

## Staking & Rewards Entities

### DragmaUnderlingsGlobalStats
Global statistics for Dragma Underlings hero staking and reward claiming.

```graphql
type DragmaUnderlingsGlobalStats @entity {
  id: ID! # Singleton: 'global'
  totalStakedHeroes: Int! # Total heroes ever staked
  currentStakedHeroes: Int! # Currently staked heroes
  totalUnstakedHeroes: Int! # Total heroes ever unstaked
  totalRewardsClaimed: BigInt! # Total rewards claimed globally
  totalClaims: Int! # Total number of claim events
  averageClaimAmount: BigInt! # Calculated: totalRewards / totalClaims
  heroesByLevel: [Int!]! # Distribution by level (0-100)
  lastUpdated: BigInt!
}
```

**Field Details:**
- `totalStakedHeroes`: Cumulative count of all staking events
- `currentStakedHeroes`: Currently staked heroes (incremented on stake, decremented on unstake)
- `totalUnstakedHeroes`: Cumulative count of all unstaking events
- `totalRewardsClaimed`: Total rewards claimed in wei
- `totalClaims`: Total number of claim events
- `averageClaimAmount`: Calculated as `totalRewardsClaimed / totalClaims`
- `heroesByLevel`: Array of 101 elements tracking hero distribution by level
- `lastUpdated`: Timestamp of last update

### DragmaUnderlingsUserStats
Per-user statistics for Dragma Underlings hero staking and rewards.

```graphql
type DragmaUnderlingsUserStats @entity {
  id: Bytes! # User address
  stakedHeroes: Int! # Total heroes staked by this user
  currentStakedHeroes: Int! # Currently staked heroes
  totalStakes: Int! # Total stake events
  totalUnstakes: Int! # Total unstake events
  totalRewardsClaimed: BigInt! # Total rewards claimed by this user
  totalClaims: Int! # Total claim events
  averageStakingDuration: BigInt! # Average staking duration in seconds
  heroesByLevel: [Int!]! # Distribution by level (0-100)
  player: Player!
}
```

**Field Details:**
- `stakedHeroes`: Total heroes ever staked by this user
- `currentStakedHeroes`: Currently staked heroes for this user
- `totalStakes`: Total number of stake events for this user
- `totalUnstakes`: Total number of unstake events for this user
- `totalRewardsClaimed`: Total rewards claimed by this user in wei
- `totalClaims`: Total number of claim events for this user
- `averageStakingDuration`: Average staking duration in seconds
- `heroesByLevel`: Array of 101 elements tracking hero distribution by level

### DragmaGlobalStats
Global statistics for the new Dragma contract (hero staking with death/revival mechanics).

```graphql
type DragmaGlobalStats @entity {
  id: ID! # Singleton: 'global'
  totalHeroes: Int! # Total heroes ever staked for Dragma
  totalHeroesPerZone: [Int!]! # [TAILS, LEGS, TORSO, HEAD]
  heroesByLevel: [Int!]! # Distribution by level (0-100)
  totalFeesPerZone: [BigInt!]! # Total fees paid per zone
  totalRewardsAmount: BigInt! # Total rewards earned
  rewardsPerZone: [[Int!]!]! # [zone] × [primary, secondary1, secondary2, secondary3, tertiary]
  totalShardsWon: Int! # Total weapon shards won
  shardsPerZone: [Int!]! # Shards won per zone
  totalBonuses: Int! # Total bonus items won
  bonusesPerZone: [Int!]! # Bonuses won per zone
  totalDeaths: Int! # Total number of deaths
  totalRevivals: Int! # Total number of revivals
  totalSpentOnRevive: BigInt! # Total cost spent on revivals
  totalSessionsPerZone: [Int!]! # Sessions per zone
  lastUpdated: BigInt!
}
```

**Field Details:**
- `totalHeroes`: Total heroes ever staked for Dragma
- `totalHeroesPerZone`: Array [TAILS(0), LEGS(1), TORSO(2), HEAD(3)]
- `heroesByLevel`: Array of 101 elements tracking hero distribution by level
- `totalFeesPerZone`: Total fees paid per Dragma zone in wei
- `totalRewardsAmount`: Total rewards earned from Dragma in wei
- `rewardsPerZone`: Nested array [zone][rewardType] tracking rewards by zone and type
- `totalShardsWon`: Total weapon shards won from Dragma
- `shardsPerZone`: Weapon shards won per Dragma zone
- `totalBonuses`: Total bonus items won from Dragma
- `bonusesPerZone`: Bonus items won per Dragma zone
- `totalDeaths`: Total number of deaths in Dragma
- `deathsPerZone`: Array [TAILS, LEGS, TORSO, HEAD] tracking deaths by zone
- `totalRevivals`: Total number of revivals in Dragma
- `totalSpentOnRevive`: Total cost spent on Dragma revivals
- `totalSessionsPerZone`: Total Dragma sessions per zone
- `totalGachaWon`: Total gacha tokens won
- `gachaByTokenId`: Array [BRONZE, SILVER, GOLD, RAINBOW] tracking gacha by type
- `gachaPerZone`: Array [TAILS, LEGS, TORSO, HEAD] tracking gacha by zone
- `gachaByZoneAndTokenId`: 2D array [zone][tokenId] tracking gacha by zone and type

### DragmaUserStats
Per-user statistics for the new Dragma contract.

```graphql
type DragmaUserStats @entity {
  id: Bytes! # User address
  totalHeroes: Int! # Total heroes staked
  heroesPerZone: [Int!]! # Heroes staked per zone
  heroesByLevel: [Int!]! # Distribution by level (0-100)
  totalFees: BigInt! # Total fees paid
  feesPerZone: [BigInt!]! # Fees paid per zone
  totalRewardsAmount: BigInt! # Total rewards earned
  rewardsPerZone: [[Int!]!]! # [zone] × [primary, secondary1, secondary2, secondary3, tertiary]
  totalShardsWon: Int! # Total weapon shards won
  shardsPerZone: [Int!]! # Shards won per zone
  totalBonuses: Int! # Total bonus items won
  bonusesPerZone: [Int!]! # Bonuses won per zone
  totalDeaths: Int! # Total number of deaths
  totalRevivals: Int! # Total number of revivals
  totalSpentOnRevive: BigInt! # Total cost spent on revivals
  totalSessionsPerZone: [Int!]! # Sessions per zone
  player: Player!
}
```

**Field Details:**
- `totalHeroes`: Total heroes staked by this user for Dragma
- `heroesPerZone`: Array [TAILS(0), LEGS(1), TORSO(2), HEAD(3)]
- `heroesByLevel`: Array of 101 elements tracking hero distribution by level
- `totalFees`: Total fees paid by this user for Dragma in wei
- `feesPerZone`: Fees paid per Dragma zone in wei
- `totalRewardsAmount`: Total rewards earned by this user from Dragma in wei
- `rewardsPerZone`: Nested array [zone][rewardType] tracking rewards by zone and type
- `totalShardsWon`: Total weapon shards won by this user
- `shardsPerZone`: Weapon shards won per Dragma zone
- `totalBonuses`: Total bonus items won by this user
- `bonusesPerZone`: Bonus items won per Dragma zone
- `totalDeaths`: Total number of deaths for this user in Dragma
- `deathsPerZone`: Array [TAILS, LEGS, TORSO, HEAD] tracking deaths by zone for this user
- `totalRevivals`: Total number of revivals for this user in Dragma
- `totalSpentOnRevive`: Total cost spent on Dragma revivals by this user
- `totalSessionsPerZone`: Total Dragma sessions per zone for this user
- `totalGachaWon`: Total gacha tokens won by this user
- `gachaByTokenId`: Array [BRONZE, SILVER, GOLD, RAINBOW] tracking gacha by type
- `gachaPerZone`: Array [TAILS, LEGS, TORSO, HEAD] tracking gacha by zone
- `gachaByZoneAndTokenId`: 2D array [zone][tokenId] tracking gacha by zone and type

## Training Entities

### GymGlobalStats
Global statistics for hero training and level upgrades.

```graphql
type GymGlobalStats @entity {
  id: ID! # 'global'
  totalAttemptedTrainings: Int! # Total training attempts
  totalSuccessfulTrainings: Int! # Total successful trainings
  totalFailedTrainings: Int! # Total failed trainings
  attemptedByType: [Int!]! # [NORMAL, CHAOS, UNKNOWN]
  successfulByType: [Int!]! # [NORMAL, CHAOS, UNKNOWN]
  failedByType: [Int!]! # [NORMAL, CHAOS, UNKNOWN]
  totalOutcomeSumByType: [BigInt!]! # Sum of outcomes by type
  outcomesCountByType: [[Int!]!]! # Detailed outcome counts by type
  sumOfChancesByType: [[BigInt!]!]! # Sum of chances by type
  chancesCountByType: [Int!]! # Number of chance records by type
  totalSpent: BigInt! # Total cost spent on training
  spentByType: [BigInt!]! # Costs by training type
  lastUpdated: BigInt!
}
```

**Field Details:**
- `totalAttemptedTrainings`: Total training attempts across all types
- `totalSuccessfulTrainings`: Total successful trainings (level increased)
- `totalFailedTrainings`: Total failed trainings (level unchanged)
- `attemptedByType`: Array [NORMAL, CHAOS, UNKNOWN] tracking attempts by type
- `successfulByType`: Array [NORMAL, CHAOS, UNKNOWN] tracking successes by type
- `failedByType`: Array [NORMAL, CHAOS, UNKNOWN] tracking failures by type
- `totalOutcomeSumByType`: Sum of level increases by training type
- `outcomesCountByType`: 2D array tracking detailed outcome counts by type
- `sumOfChancesByType`: Sum of success chances by training type
- `chancesCountByType`: Number of chance records by training type
- `totalSpent`: Total cost spent on training in wei
- `spentByType`: Array [NORMAL, CHAOS, UNKNOWN] tracking costs by type

### GymUserStats
Per-user statistics for hero training.

```graphql
type GymUserStats @entity {
  id: Bytes! # User address
  totalAttemptedTrainings: Int!
  totalSuccessfulTrainings: Int!
  totalFailedTrainings: Int!
  attemptedByType: [Int!]! # [NORMAL, CHAOS, UNKNOWN]
  successfulByType: [Int!]! # [NORMAL, CHAOS, UNKNOWN]
  failedByType: [Int!]! # [NORMAL, CHAOS, UNKNOWN]
  totalOutcomeSumByType: [BigInt!]! # Sum of outcomes by type
  outcomesCountByType: [[Int!]!]! # Detailed outcome counts by type
  sumOfChancesByType: [[BigInt!]!]! # Sum of chances by type
  chancesCountByType: [Int!]! # Number of chance records by type
  totalSpent: BigInt! # Total cost spent on training
  spentByType: [BigInt!]! # Costs by training type
  player: Player!
}
```

**Field Details:**
- Same structure as GymGlobalStats but per-user
- All arrays follow same indexing: [NORMAL, CHAOS, UNKNOWN]
- `outcomesCountByType`: 2D array with detailed outcome tracking
- `sumOfChancesByType`: 2D array with chance tracking by type

## Fishing Entities

### FishingGlobalStats
Global statistics for fishing mini-game.

```graphql
type FishingGlobalStats @entity {
  id: ID! # 'global'
  totalHeroes: Int! # Total heroes ever staked for fishing
  totalHeroesPerZone: [Int!]! # [SLIME_BAY, SHROOM_GROTTO, SKEET_PIER, MAGMA_MIRE]
  heroesByLevel: [Int!]! # Distribution by level (0-100)
  totalFeesPerZone: [BigInt!]! # Total fees paid per zone
  totalRewardsAmount: BigInt! # Total rewards earned
  rewardsPerZone: [BigInt!]! # Rewards earned per zone
  totalShardsWon: Int! # Total weapon shards won
  shardsPerZone: [Int!]! # Shards won per zone
  totalBonuses: Int! # Total bonus items won
  bonusesPerZone: [Int!]! # Bonuses won per zone
  lastUpdated: BigInt!
}
```

**Field Details:**
- `totalHeroes`: Total heroes ever staked for fishing
- `totalHeroesPerZone`: Array [SLIME_BAY(0), SHROOM_GROTTO(1), SKEET_PIER(2), MAGMA_MIRE(3)]
- `heroesByLevel`: Array of 101 elements tracking hero distribution by level
- `totalFeesPerZone`: Total fees paid per fishing zone in wei
- `totalRewardsAmount`: Total rewards earned from fishing in wei
- `rewardsPerZone`: Rewards earned per fishing zone in wei
- `totalShardsWon`: Total weapon shards won from fishing
- `shardsPerZone`: Weapon shards won per fishing zone
- `totalBonuses`: Total bonus items won from fishing
- `bonusesPerZone`: Bonus items won per fishing zone
- `totalDeaths`: Total number of deaths in fishing
- `deathsPerZone`: Array [SLIME_BAY, SHROOM_GROTTO, SKEET_PIER, MAGMA_MIRE] tracking deaths by zone
- `totalRevivals`: Total number of revivals in fishing
- `totalSpentOnRevive`: Total cost spent on fishing revivals

### FishingUserStats
Per-user statistics for fishing.

```graphql
type FishingUserStats @entity {
  id: Bytes! # User address
  totalHeroes: Int! # Total heroes staked
  heroesPerZone: [Int!]! # Heroes staked per zone
  heroesByLevel: [Int!]! # Distribution by level (0-100)
  totalFees: BigInt! # Total fees paid
  feesPerZone: [BigInt!]! # Fees paid per zone
  totalRewardsAmount: BigInt! # Total rewards earned
  rewardsPerZone: [BigInt!]! # Rewards earned per zone
  totalShardsWon: Int! # Total weapon shards won
  shardsPerZone: [Int!]! # Shards won per zone
  totalBonuses: Int! # Total bonus items won
  bonusesPerZone: [Int!]! # Bonuses won per zone
  totalSessionsPerZone: [Int!]! # Sessions per zone
  player: Player!
}
```

**Field Details:**
- `totalHeroes`: Total heroes staked by this user for fishing
- `heroesPerZone`: Array [SLIME_BAY(0), SHROOM_GROTTO(1), SKEET_PIER(2), MAGMA_MIRE(3)]
- `heroesByLevel`: Array of 101 elements tracking hero distribution by level
- `totalFees`: Total fees paid by this user for fishing in wei
- `feesPerZone`: Fees paid per fishing zone in wei
- `totalRewardsAmount`: Total rewards earned by this user from fishing in wei
- `rewardsPerZone`: Rewards earned per fishing zone in wei
- `totalShardsWon`: Total weapon shards won by this user
- `shardsPerZone`: Weapon shards won per fishing zone
- `totalBonuses`: Total bonus items won by this user
- `bonusesPerZone`: Bonus items won per fishing zone
- `totalSessionsPerZone`: Total fishing sessions per zone
- `totalDeaths`: Total number of deaths for this user in fishing
- `deathsPerZone`: Array [SLIME_BAY, SHROOM_GROTTO, SKEET_PIER, MAGMA_MIRE] tracking deaths by zone for this user
- `totalRevivals`: Total number of revivals for this user in fishing
- `totalSpentOnRevive`: Total cost spent on fishing revivals by this user

## Remix Entities

### RemixGlobalStats
Global statistics for weapon remixing/combining system.

```graphql
type RemixGlobalStats @entity {
  id: ID! # 'global'
  totalRemixes: BigInt! # Total remixes ever performed
  remixesByNumWeapons: [BigInt!]! # [2 weapons, 3, 4, 5]
  totalSpent: BigInt! # Total cost spent on remixes
  spentByNumWeapons: [BigInt!]! # Costs by number of weapons
  outcomesByTypeAndRarity: [[[BigInt!]!]!]! # [numWeapons][rarity][outcome]
  lastUpdated: BigInt!
}
```

**Field Details:**
- `totalRemixes`: Total remixes ever performed
- `remixesByNumWeapons`: Array [2, 3, 4, 5] weapons used in remix
- `totalSpent`: Total cost spent on remixes in wei
- `spentByNumWeapons`: Costs by number of weapons used in remix
- `outcomesByTypeAndRarity`: 3D array [numWeapons][rarity][outcome]
  - First dimension: Number of weapons (2-5) → Index 0-3
  - Second dimension: Source rarity (0-5) → Index 0-5
  - Third dimension: Outcome (0-2) → Index 0-2 (FAIL, SUCCESS, PERFECT)

### RemixUserStats
Per-user statistics for weapon remixing.

```graphql
type RemixUserStats @entity {
  id: Bytes! # User address
  totalRemixes: BigInt! # Total remixes performed by this user
  remixesByNumWeapons: [BigInt!]! # [2 weapons, 3, 4, 5]
  totalSpent: BigInt! # Total cost spent on remixes
  spentByNumWeapons: [BigInt!]! # Costs by number of weapons
  outcomesByTypeAndRarity: [[[BigInt!]!]!]! # [numWeapons][rarity][outcome]
  player: Player!
}
```

**Field Details:**
- Same structure as RemixGlobalStats but per-user
- `outcomesByTypeAndRarity`: 3D array with same indexing as global stats
- `remixesByNumWeapons`: Array [2, 3, 4, 5] weapons used in remix by this user

## Activity Tracking

### Activity
Unified activity feed for all game events.

```graphql
type Activity @entity {
  id: ID! # Format: chainId_block_logIndex
  timestamp: BigInt!
  user: Bytes! # Address involved
  eventType: String! # Event type (e.g., 'STAKE', 'UNSTAKE', 'REMIX', 'TRAINING')
  details: String! # JSON stringified details
  contract: String! # Contract name (e.g., 'DragmaUnderlings', 'WeaponRemixer')
  heroId: String # Optional, for hero-specific filters
  hero: Hero @index # Relation to hero (optional)
  stakingType: StakingType # Optional, for staking type differentiation
}
```

**Field Details:**
- `id`: Unique identifier combining chainId, block number, and log index
- `timestamp`: Unix timestamp of the event
- `user`: Wallet address involved in the event
- `eventType`: Event type for filtering (STAKE, UNSTAKE, CLAIM, REMIX, TRAINING, etc.)
- `details`: JSON string containing event-specific details
- `contract`: Contract name that emitted the event
- `heroId`: Optional hero ID for hero-specific events
- `hero`: Relation to Hero entity (optional)
- `stakingType`: Optional staking type for staking events

## Event Types and Details

The subgraph tracks various event types with detailed information stored as JSON strings. Here are all the supported event types and their detail structures:

### Contract Addresses
- **DragmaUnderlings**: `0xd6C4268BC7252eAd69Da0d801CbAD9508Fc58F85`
- **Fishing**: `0x826C2ecf3a5707b3a784a9C386d3dd52293F9164`
- **Dragma**: `0xA651e1918d29e142eAc406374e6BC6abFc5c40e9`
- **HeroArmory**: `0x036A2598A6752b4986a629964F428680F737DECD`

### Staking Events

#### DRAGMA_STAKE
**Contract**: `DragmaUnderlings`  
**Description**: Hero staked for rewards in Dragma Underlings system

```json
{
  "heroId": "123"
}
```

#### DRAGMA_UNSTAKE
**Contract**: `DragmaUnderlings`  
**Description**: Hero unstaked from Dragma Underlings system

```json
{
  "heroId": "123"
}
```

#### DRAGMA_CLAIM
**Contract**: `DragmaUnderlings`  
**Description**: Rewards claimed from staked hero

```json
{
  "heroId": "123",
  "amount": "1000000000000000000"
}
```

#### DRAGMA_STAKE
**Contract**: `Dragma`  
**Description**: Hero staked for Dragma rewards with death/revival mechanics

```json
{
  "heroId": "123",
  "entryFee": "500000000000000000",
  "attackZone": "0"
}
```

#### DRAGMA_UNSTAKE_REQUEST
**Contract**: `Dragma`  
**Description**: Unstake requested for Dragma hero

```json
{
  "heroId": "123",
  "requestId": "456"
}
```

#### DRAGMA_UNSTAKE
**Contract**: `Dragma`  
**Description**: Hero unstaked from Dragma with rewards

```json
{
  "heroId": "123",
  "requestId": "456",
  "gachaTokenId": "3",
  "weaponShardQty": "2",
  "primaryRewards": ["18", "18", "6"],
  "secondaryRewards": ["7", "8"],
  "tertiaryRewards": ["5"]
}
```

#### DRAGMA_DEATH
**Contract**: `Dragma`  
**Description**: Hero died in Dragma

```json
{
  "heroId": "123"
}
```

#### DRAGMA_REVIVAL
**Contract**: `Dragma`  
**Description**: Hero revived in Dragma

```json
{
  "heroId": "123",
  "cost": "1000000000000000000"
}
```

#### FISHING_DEATH
**Contract**: `Fishing`  
**Description**: Hero died in fishing

```json
{
  "heroId": "123"
}
```

#### FISHING_REVIVAL
**Contract**: `Fishing`  
**Description**: Hero revived in fishing

```json
{
  "heroId": "123",
  "cost": "1000000000000000000"
}
```

#### FISHING_STAKE
**Contract**: `Fishing`  
**Description**: Hero staked for fishing mini-game

```json
{
  "fee": "500000000000000000",
  "zone": "0"
}
```

#### FISHING_UNSTAKE
**Contract**: `Fishing`  
**Description**: Hero unstaked from fishing with rewards

```json
{
  "amount": "1000000000000000000",
  "weaponShardId": "456",
  "bonusId": "789"
}
```

### Training Events

#### TRAINING_UPGRADE
**Contract**: `Gym`  
**Description**: Hero level upgraded through training

**Normal Training:**
```json
{
  "heroId": "456",
  "oldLevel": "5",
  "newLevel": "6",
  "trainingType": "NORMAL",
  "cost": "500000000000000000"
}
```

**Chaos Training:**
```json
{
  "heroId": "456",
  "oldLevel": "5",
  "newLevel": "7",
  "trainingType": "CHAOS",
  "cost": "500000000000000000",
  "chances": ["1000", "950", "900", "850", "800", "750", "700", "650", "600", "550", "500"]
}
```

**Unknown Training:**
```json
{
  "heroId": "456",
  "oldLevel": "5",
  "newLevel": "6",
  "trainingType": "UNKNOWN",
  "cost": "500000000000000000",
  "chances": ["1000", "950", "900", "850", "800"]
}
```

### Weapon Events

#### REMIX
**Contract**: `WeaponRemixer`  
**Description**: Weapons combined/remixed to create new weapon

```json
{
  "numWeapons": 3,
  "sourceRarity": 2,
  "outcome": 1,
  "cost": "1000000000000000000",
  "generatedWeaponId": "123",
  "remixedWeaponIds": ["100", "101", "102"],
  "remixType": "NORMAL"
}
```

#### DURABILITY_UPDATE
**Contract**: `DragmaUnderlings` / `Dragma`  
**Description**: Weapon durability updated during gameplay

```json
{
  "weaponId": "456",
  "oldDurability": "100",
  "newDurability": "95"
}
```

#### SHARPNESS_UPDATE
**Contract**: `DragmaUnderlings` / `Dragma`  
**Description**: Weapon sharpness updated during gameplay

```json
{
  "weaponId": "456",
  "oldSharpness": "50",
  "newSharpness": "45"
}
```

### Equipment Events

#### EQUIP_WEAPON
**Contract**: `HeroArmory`  
**Description**: Weapon equipped to hero

```json
{
  "heroId": "123",
  "weaponId": "456"
}
```

#### UNEQUIP_WEAPON
**Contract**: `HeroArmory`  
**Description**: Weapon unequipped from hero

```json
{
  "heroId": "123",
  "weaponId": "456"
}
```

### Transfer Events

#### HERO_TRANSFER
**Contract**: `Hero721`  
**Description**: Hero NFT transferred between addresses

```json
{
  "from": "0x123...",
  "to": "0x456...",
  "tokenId": "789"
}
```

#### WEAPON_TRANSFER
**Contract**: `Weapon721`  
**Description**: Weapon NFT transferred between addresses

```json
{
  "from": "0x123...",
  "to": "0x456...",
  "tokenId": "789"
}
```

#### GACHA_TRANSFER
**Contract**: `Gacha1155`  
**Description**: Gacha tokens transferred

```json
{
  "from": "0x123...",
  "to": "0x456...",
  "tokenId": "1",
  "amount": "10"
}
```

#### ITEMS_TRANSFER
**Contract**: `Items`  
**Description**: Game items transferred

```json
{
  "from": "0x123...",
  "to": "0x456...",
  "tokenId": "2",
  "amount": "5"
}
```

### Weapon Generation Events

#### WEAPON_GENERATED_GACHA
**Contract**: `GachaWeaponMachine`  
**Description**: Weapon generated from gacha machine

```json
{
  "weaponId": "123",
  "requestId": "456",
  "gachaTokenId": "1"
}
```

#### WEAPON_GENERATED_HERO
**Contract**: `HeroWeaponMachine`  
**Description**: Weapon generated from hero machine

```json
{
  "weaponId": "123",
  "requestId": "456",
  "slot": "0",
  "cost": "1000000000000000000"
}
```

#### WEAPON_GENERATED_DIRECT
**Contract**: `Weapon721`  
**Description**: Weapon directly minted/generated

```json
{
  "weaponId": "123",
  "qty": "1"
}
```

### Blacksmith Events

#### WEAPON_REPAIRED
**Contract**: `Blacksmith`  
**Description**: Weapon repaired (durability restored)

```json
{
  "weaponId": "123",
  "amount": "100000000000000000"
}
```

#### WEAPON_SHARPENED
**Contract**: `Blacksmith`  
**Description**: Weapon sharpened (sharpness restored)

```json
{
  "weaponId": "123",
  "amount": "200000000000000000"
}
```

## Event Type Summary

| Event Type | Contract | Description | Hero ID | Staking Type |
|------------|----------|-------------|---------|--------------|
| `DRAGMA_STAKE` | DragmaUnderlings | Hero staked for rewards | ✅ | DRAGMA_UNDERLINGS |
| `DRAGMA_UNSTAKE` | DragmaUnderlings | Hero unstaked from rewards | ✅ | DRAGMA_UNDERLINGS |
| `DRAGMA_CLAIM` | DragmaUnderlings | Rewards claimed | ✅ | DRAGMA_UNDERLINGS |
| `DRAGMA_STAKE` | Dragma | Hero staked for Dragma rewards | ✅ | DRAGMA_* |
| `DRAGMA_UNSTAKE_REQUEST` | Dragma | Unstake requested | ✅ | DRAGMA_* |
| `DRAGMA_UNSTAKE` | Dragma | Hero unstaked from Dragma | ✅ | DRAGMA_* |
| `DRAGMA_DEATH` | Dragma | Hero died in Dragma | ✅ | DRAGMA_* |
| `DRAGMA_REVIVAL` | Dragma | Hero revived in Dragma | ✅ | DRAGMA_* |
| `FISHING_DEATH` | Fishing | Hero died in fishing | ✅ | FISHING_* |
| `FISHING_REVIVAL` | Fishing | Hero revived in fishing | ✅ | FISHING_* |
| `FISHING_STAKE` | Fishing | Hero staked for fishing | ✅ | FISHING_* |
| `FISHING_UNSTAKE` | Fishing | Hero unstaked from fishing | ✅ | FISHING_* |
| `TRAINING_UPGRADE` | Gym | Hero level upgraded | ✅ | - |
| `REMIX` | WeaponRemixer | Weapons combined | ❌ | - |
| `DURABILITY_UPDATE` | DragmaUnderlings/Dragma | Weapon durability changed | ❌ | - |
| `SHARPNESS_UPDATE` | DragmaUnderlings/Dragma | Weapon sharpness changed | ❌ | - |
| `EQUIP_WEAPON` | HeroArmory | Weapon equipped | ✅ | - |
| `UNEQUIP_WEAPON` | HeroArmory | Weapon unequipped | ✅ | - |
| `HERO_TRANSFER` | Hero721 | Hero NFT transferred | ✅ | - |
| `WEAPON_TRANSFER` | Weapon721 | Weapon NFT transferred | ❌ | - |
| `GACHA_TRANSFER` | Gacha1155 | Gacha tokens transferred | ❌ | - |
| `ITEMS_TRANSFER` | Items | Game items transferred | ❌ | - |
| `WEAPON_GENERATED_*` | Various | Weapon generated | ❌ | - |
| `WEAPON_REPAIRED` | Blacksmith | Weapon repaired | ❌ | - |
| `WEAPON_SHARPENED` | Blacksmith | Weapon sharpened | ❌ | - |

### HeroesGlobalStats

```graphql
type HeroesGlobalStats @entity {
  id: ID! # 'global'
  totalHeroes: Int! # Total heroes existing
  totalMinted: Int! # Cumulative heroes minted
  totalBurned: Int! # Cumulative heroes burned
  heroesByLevel: [Int!]! # Distribution by level (0-100)
  lastUpdated: BigInt!
}
```

**Field Details:**
- `totalHeroes`: Current total number of heroes in existence
- `totalMinted`: Cumulative count of all heroes ever minted
- `totalBurned`: Cumulative count of all heroes ever burned
- `heroesByLevel`: Array of 101 elements tracking hero distribution by level
- `lastUpdated`: Timestamp of last update

## Enums

### WeaponSource
```graphql
enum WeaponSource {
  GACHA_MACHINE # Generated from gacha tokens
  HERO_MACHINE # Generated from hero machine
  REMIXER # Created by combining other weapons
  DIRECT_MINT # Directly minted (admin/special events)
}
```

### RemixType
```graphql
enum RemixType {
  NORMAL # Standard weapon mixing (2-5 weapons)
  LEGENDARY # Legendary weapon mixing (3 legendary weapons → mythic chance)
}
```

### RemixOutcome
```graphql
enum RemixOutcome {
  FAIL # +0 tier (no upgrade)
  SUCCESS # +1 tier upgrade
  PERFECT # +2 tier upgrade
}
```

### StakingType
```graphql
enum StakingType {
  DRAGMA_UNDERLINGS # Standard hero staking for rewards
  FISHING_SLIME_BAY # Fishing in Slime Bay zone
  FISHING_SHROOM_GROTTO # Fishing in Shroom Grotto zone
  FISHING_SKEET_PIER # Fishing in Skeet Pier zone
  FISHING_MAGMA_MIRE # Fishing in Magma Mire zone
  DRAGMA_TAILS # Dragma in Tails zone
  DRAGMA_LEGS # Dragma in Legs zone
  DRAGMA_TORSO # Dragma in Torso zone
  DRAGMA_HEAD # Dragma in Head zone
}
```

### TrainingType
```graphql
enum TrainingType {
  NORMAL # Normal training method
  CHAOS # Chaos training method
  UNKNOWN # Unknown training method
}
```

### GachaType
```graphql
enum GachaType {
  BRONZE # Bronze gacha tokens (lowest tier)
  SILVER # Silver gacha tokens
  GOLD # Gold gacha tokens
  RAINBOW # Rainbow gacha tokens (highest tier)
}
```

### DeathLocation
```graphql
enum DeathLocation {
  FISHING # Hero died in Fishing contract
  DRAGMA # Hero died in Dragma contract
}
```

## Game Mechanics

### Training System
- **Cooldown**: 24 hours between training sessions
- **Cost Formula**: `(Level * 10000e18) / (69 + Level)`
- **Types**: NORMAL, CHAOS, UNKNOWN
- **Outcomes**: Level increase (0-2 levels per training)

### Staking System
- **Dragma Underlings**: 6-hour unstake cooldown
- **Fishing**: 12-hour unstake cooldown
- **Dragma**: 12-hour unstake cooldown
- **Rewards**: Based on hero level and weapon sharpness
- **Fishing Zones**: SLIME_BAY(0), SHROOM_GROTTO(1), SKEET_PIER(2), MAGMA_MIRE(3)
- **Dragma Zones**: TAILS(0), LEGS(1), TORSO(2), HEAD(3)

### Weapon System
- **Rarities**: COMMON(0) to MYTHIC(6)
- **Coefficients**: [1,2,3,5,8,13,21] for damage calculation
- **Sharpness**: Affects reward bonus (0-20%)
- **Durability**: Affects weapon usage

### Remix System
- **Weapons**: 2-5 weapons can be combined
- **Outcomes**: FAIL(+0), SUCCESS(+1), PERFECT(+2)
- **Legendary**: Special remix with 3 legendary weapons

## Query Examples

### Remix Statistics

```graphql
# Total remixes globally
query {
  remixGlobalStats {
    totalRemixes
    totalSpent
  }
}

# Remixes by number of weapons
query {
  remixGlobalStats {
    remixesByNumWeapons # [2, 3, 4, 5 weapons]
  }
}

# Specific outcome: 3 weapons, rarity 3, perfect (+2)
query {
  remixGlobalStats {
    outcomesByTypeAndRarity # Index [1][3][2] for 3 weapons, rarity 3, perfect
  }
}

# User remix statistics
query {
  remixUserStats(id: "0x123...") {
    totalRemixes
    totalSpent
    outcomesByTypeAndRarity
  }
}
```

### Training Statistics

```graphql
# Global training stats
query {
  gymGlobalStats {
    totalAttemptedTrainings
    totalSuccessfulTrainings
    totalFailedTrainings
    attemptedByType # [NORMAL, CHAOS, UNKNOWN]
    successfulByType
    failedByType
    totalSpent
    spentByType
  }
}

# User training stats
query {
  gymUserStats(id: "0x123...") {
    totalAttemptedTrainings
    totalSuccessfulTrainings
    totalFailedTrainings
    attemptedByType
    successfulByType
    failedByType
    totalSpent
    spentByType
  }
}
```

### Staking Statistics

```graphql
# Global Dragma Underlings stats
query {
  dragmaUnderlingsGlobalStats {
    totalStakedHeroes
    currentStakedHeroes
    totalRewardsClaimed
    totalClaims
    averageClaimAmount
  }
}

# User Dragma Underlings stats
query {
  dragmaUnderlingsUserStats(id: "0x123...") {
    stakedHeroes
    currentStakedHeroes
    totalRewardsClaimed
    totalClaims
    averageStakingDuration
  }
}

# Global Dragma stats
query {
  dragmaGlobalStats {
    totalHeroes
    totalHeroesPerZone
    totalFeesPerZone
    totalRewardsAmount
    totalShardsWon
    totalBonuses
    totalGachaWon
    gachaByTokenId # [BRONZE, SILVER, GOLD, RAINBOW]
    gachaPerZone # [TAILS, LEGS, TORSO, HEAD]
    totalDeaths
    deathsPerZone # [TAILS, LEGS, TORSO, HEAD]
    totalRevivals
  }
}

# User Dragma stats
query {
  dragmaUserStats(id: "0x123...") {
    totalHeroes
    heroesPerZone
    totalFees
    totalRewardsAmount
    totalShardsWon
    totalBonuses
    totalGachaWon
    gachaByTokenId # [BRONZE, SILVER, GOLD, RAINBOW]
    gachaPerZone # [TAILS, LEGS, TORSO, HEAD]
    totalDeaths
    deathsPerZone # [TAILS, LEGS, TORSO, HEAD]
    totalRevivals
  }
}

# Global Fishing stats
query {
  fishingGlobalStats {
    totalHeroes
    totalHeroesPerZone
    totalFeesPerZone
    totalRewardsAmount
    totalShardsWon
    totalBonuses
    totalDeaths
    deathsPerZone # [SLIME_BAY, SHROOM_GROTTO, SKEET_PIER, MAGMA_MIRE]
    totalRevivals
  }
}

# User Fishing stats
query {
  fishingUserStats(id: "0x123...") {
    totalHeroes
    heroesPerZone
    totalFees
    totalRewardsAmount
    totalShardsWon
    totalBonuses
    totalDeaths
    deathsPerZone # [SLIME_BAY, SHROOM_GROTTO, SKEET_PIER, MAGMA_MIRE]
    totalRevivals
  }
}
```

### Activity Feed

```graphql
# All activities for a user
query {
  activities(where: {user: "0x123..."}) {
    timestamp
    eventType
    details
    contract
  }
}

# Remix activities only
query {
  activities(
    where: {
      user: "0x123...",
      eventType: "REMIX"
    }
  ) {
    timestamp
    details # JSON with remix details
  }
}

# Training activities
query {
  activities(
    where: {
      user: "0x123...",
      eventType: "TRAINING_UPGRADE"
    }
  ) {
    timestamp
    details
  }
}

# Staking activities
query {
  activities(
    where: {
      user: "0x123...",
      eventType_in: ["DRAGMA_STAKE", "FISHING_STAKE"]
    }
  ) {
    timestamp
    eventType
    details
    stakingType
  }
}

# Death and revival activities
query {
  activities(
    where: {
      user: "0x123...",
      eventType_in: ["DRAGMA_DEATH", "FISHING_DEATH", "DRAGMA_REVIVAL", "FISHING_REVIVAL"]
    }
  ) {
    timestamp
    eventType
    details
  }
}
```

### Hero and Weapon Queries

```graphql
# Player with all heroes and weapons
query {
  player(id: "0x123...") {
    id
    balance
    heroCount
    weaponCount
    stakedHeroCount
    heroes {
      id
      level
      staked
      stakingType
      isDead
      deathLocation
      equippedWeapon {
        id
        rarity
        weaponType
        sharpness
        maxSharpness
        durability
        maxDurability
      }
    }
    weapons {
      id
      rarity
      source
      equipped
      equippedHeroId
    }
  }
}

# Heroes by level distribution
query {
  heroesGlobalStats {
    heroesByLevel # Distribution 0-100
  }
}

# Hero with detailed stats
query {
  hero(id: "123") {
    id
    level
    damage
    staked
    stakingType
    isDead
    deathLocation
    totalDeaths
    totalRevivals
    totalAttemptedTrainings
    totalSuccessfulTrainings
    totalFailedTrainings
    equippedWeapon {
      id
      rarity
      weaponType
      sharpness
      maxSharpness
      durability
      maxDurability
    }
  }
}

# Weapon with source tracking
query {
  weapon(id: "456") {
    id
    rarity
    source
    weaponType
    sharpness
    maxSharpness
    durability
    maxDurability
    equipped
    equippedHeroId
    sourceGachaTokenId
    sourceHeroCost
    sourceRemixedWeaponIds
    sourceRemixRarity
    sourceRemixType
  }
}
```

## Data Structure Details

### Remix Outcomes Array
The `outcomesByTypeAndRarity` array is structured as:
- **First dimension**: Number of weapons (2-5) → Index 0-3
- **Second dimension**: Source rarity (0-5) → Index 0-5
- **Third dimension**: Outcome (0-2) → Index 0-2

Example: `outcomesByTypeAndRarity[1][3][2]` = Remixes with 3 weapons, source rarity 3, perfect outcome (+2)

### Training Arrays
The training arrays follow the pattern:
- **Type index**: 0=NORMAL, 1=CHAOS, 2=UNKNOWN
- **Outcomes**: Detailed breakdown of training results
- **Chances**: Success probability tracking

### Reward Calculation Details
- **Damage**: `level * weaponCoefficient[rarity]`
- **Max Daily**: `(damage * 400 * 1e18) / (20 + level)`
- **Base Daily**: `maxDaily * 80 / 100` (80% guaranteed)
- **Sharpness Bonus**: `maxDaily * 20 * sharpness / (100 * maxSharpness)`
- **Effective Daily**: `base + bonus + 50e18` (fixed bonus)
- **Hourly Rates**: Daily values divided by 24

### Activity Details Format
Activity details are stored as JSON strings containing relevant event data:

```json
// Remix activity
{
  "numWeapons": 3,
  "sourceRarity": 2,
  "outcome": 1,
  "cost": "1000000000000000000",
  "generatedWeaponId": "123",
  "remixedWeaponIds": ["100", "101", "102"],
  "remixType": "NORMAL"
}

// Training activity
{
  "heroId": "456",
  "oldLevel": 5,
  "newLevel": 6,
  "trainingType": "NORMAL",
  "cost": "500000000000000000"
}

// Staking activity
{
  "heroId": "789",
  "stakingType": "DRAGMA_UNDERLINGS",
  "timestamp": "1640995200"
}
```

## Performance Notes

- **Arrays**: Fixed-size arrays are used for optimal query performance
- **Indexing**: Key fields are indexed for fast filtering
- **Relations**: Proper entity relationships enable efficient joins
- **BigInt**: All monetary amounts use BigInt for precision
- **Defaults**: All arrays have proper default values to avoid null issues
- **Cooldowns**: Training (11h45), Dragma Underlings staking (6h), Fishing staking (11h45), Dragma staking (11h45)

## Deployment

The subgraph is deployed on TheGraph and provides real-time indexing of all game events. Queries can be made through the GraphQL endpoint with full support for filtering, sorting, and aggregation operations.

## Contract Handlers

The subgraph includes handlers for the following contracts:
- **Blacksmith**: Weapon repair and sharpening
- **Dragma**: Hero staking and rewards with death/revival mechanics (4 zones: Tails, Legs, Torso, Head)
- **DragmaUnderlings**: Hero staking and rewards
- **Fishing**: Fishing mini-game mechanics with death/revival system
- **Gacha1155**: Gacha token transfers
- **GachaWeaponMachine**: Weapon generation from gacha
- **Gym**: Hero training and level upgrades (Normal, Chaos, Unknown types)
- **Hero20**: Hero token transfers (ERC20)
- **Hero721**: Hero NFT transfers (ERC721)
- **HeroArmory**: Weapon equipment system
- **HeroWeaponMachine**: Weapon generation from hero machine
- **Items**: Game items transfers (ERC1155)
- **Weapon721**: Weapon NFT transfers and generation
- **WeaponRemixer**: Weapon combining/remixing system (Normal and Legendary types)
