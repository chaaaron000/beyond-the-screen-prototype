export const INITIAL_CLOCK_MINUTES = 9 * 60 + 20;
export const REFRIGERATION_DEADLINE_MINUTES = 13 * 60 + 20;

export function formatClock(totalMinutes: number): string {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = Math.floor(normalized / 60).toString().padStart(2, "0");
  const minutes = (normalized % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}시간` : `${hours}시간 ${remainder}분`;
}

export function formatRemainingPreservation(minutes: number): string {
  if (minutes <= 0) return "보존 한계 도달";
  return `${formatDuration(minutes)} 남음`;
}
