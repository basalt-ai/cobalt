import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatRelativeTime(timestamp: string): string {
	const now = Date.now();
	const then = new Date(timestamp).getTime();
	const diff = now - then;
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 7) return `${days}d ago`;
	return new Date(timestamp).toLocaleDateString();
}

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

/** Client-side percentile calculation (mirrors backend calculateStats) */
function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0;
	if (p <= 0) return sorted[0];
	if (p >= 100) return sorted[sorted.length - 1];
	const index = (p / 100) * (sorted.length - 1);
	const lower = Math.floor(index);
	const upper = Math.ceil(index);
	const weight = index - lower;
	if (lower === upper) return sorted[lower];
	return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export interface ClientStats {
	avg: number;
	min: number;
	max: number;
	p50: number;
	p95: number;
	p99: number;
}

export function computeClientStats(values: number[]): ClientStats {
	if (values.length === 0) {
		return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
	}
	const sorted = [...values].sort((a, b) => a - b);
	const sum = values.reduce((acc, v) => acc + v, 0);
	return {
		avg: sum / values.length,
		min: sorted[0],
		max: sorted[sorted.length - 1],
		p50: percentile(sorted, 50),
		p95: percentile(sorted, 95),
		p99: percentile(sorted, 99),
	};
}
