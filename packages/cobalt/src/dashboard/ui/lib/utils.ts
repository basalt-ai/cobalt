export function formatDate(timestamp: string): string {
	return new Date(timestamp).toLocaleString();
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

export function formatScore(score: number): string {
	return (score * 100).toFixed(1);
}

export function formatPercent(value: number): string {
	const sign = value > 0 ? '+' : '';
	return `${sign}${value.toFixed(1)}%`;
}
