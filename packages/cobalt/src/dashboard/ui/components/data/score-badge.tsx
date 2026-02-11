import { cn } from '../../lib/utils';

interface ScoreBadgeProps {
	score: number;
	className?: string;
	showPercent?: boolean;
}

function getScoreColor(score: number): string {
	if (score >= 0.8)
		return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
	if (score >= 0.5) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
	return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
}

export function ScoreBadge({ score, className, showPercent = false }: ScoreBadgeProps) {
	const display = showPercent ? `${(score * 100).toFixed(0)}%` : score.toFixed(2);
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums',
				getScoreColor(score),
				className,
			)}
		>
			{display}
		</span>
	);
}

export function ScoreChange({ value, className }: { value: number; className?: string }) {
	const isPositive = value > 0;
	const isNeutral = value === 0;
	const color = isNeutral
		? 'text-muted-foreground'
		: isPositive
			? 'text-emerald-600 dark:text-emerald-400'
			: 'text-red-600 dark:text-red-400';

	return (
		<span className={cn('text-xs font-medium tabular-nums', color, className)}>
			{isPositive ? '+' : ''}
			{(value * 100).toFixed(1)}%
		</span>
	);
}
