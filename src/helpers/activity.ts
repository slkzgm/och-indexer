// src/helpers/activity.ts
export async function createActivity(
  context: any,
  id: string,
  timestamp: bigint,
  user: string,
  eventType: string,
  details: any,
  heroId?: string,
  contract: string = 'Default',
  stakingType?: string
) {
  const activity = {
    id,
    timestamp,
    user,
    eventType,
    details: JSON.stringify(details),
    contract,
    heroId,
    stakingType,
  };
  await context.Activity.set(activity);
} 