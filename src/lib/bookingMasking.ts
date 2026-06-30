// Returns how many minutes before pickup the driver contact/address is revealed.
// Same day (< 24 h away)  → 0   (always visible)
// Tomorrow  (24 h – 48 h) → 4 h before
// Day after (48 h – 72 h) → 8 h before
// Further out              → 24 h before
export function revealThresholdMin(minutesUntilPickup: number): number {
  if (minutesUntilPickup <= 24 * 60) return 0;
  if (minutesUntilPickup <= 48 * 60) return 4 * 60;
  if (minutesUntilPickup <= 72 * 60) return 8 * 60;
  return 24 * 60;
}

export function isContactRevealedAt(pickupDatetime: string, nowMs = Date.now()): boolean {
  const minutesUntilPickup = (new Date(pickupDatetime).getTime() - nowMs) / 60_000;
  const threshold = revealThresholdMin(minutesUntilPickup);
  return minutesUntilPickup <= threshold;
}
