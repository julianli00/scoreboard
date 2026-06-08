export function formatScore(score: number, scoreDisplay?: string): string {
  if (scoreDisplay) {
    return scoreDisplay;
  }

  return score.toFixed(score >= 1 ? 2 : 4);
}

export function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
