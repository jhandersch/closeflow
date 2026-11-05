export type AlertSample = { event_type: string; created_at: string };

export type ErrorSpike = {
  total: number;
  threshold: number;
  windowHours: number;
  byType: Record<string, number>;
};

export const DEFAULT_SPIKE_THRESHOLD = 25;

export const parseThreshold = (raw: string | undefined) => {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_SPIKE_THRESHOLD;
};

// Returns a spike description when error events in the window reach the threshold.
export function detectErrorSpike(
  samples: AlertSample[],
  threshold: number,
  windowHours: number,
): ErrorSpike | null {
  const byType: Record<string, number> = {};
  let total = 0;
  for (const sample of samples) {
    if (!sample.event_type.startsWith("error.")) continue;
    total += 1;
    byType[sample.event_type] = (byType[sample.event_type] || 0) + 1;
  }
  return total >= threshold ? { total, threshold, windowHours, byType } : null;
}
