import { cn } from '../../lib/utils';
import type { BadgeColor } from '../ui/badge';
import { Badge, BadgeDot } from '../ui/badge';

interface ScoreBadgeProps {
	score: number;
	className?: string;
	showPercent?: boolean;
	boolean?: boolean;
}

function scoreToColor(score: number): BadgeColor {
	if (score >= 0.9) return 'lime';
	if (score >= 0.8) return 'orange';
	if (score >= 0.7) return 'amber';
	return 'tomato';
}

export function ScoreBadge({
	score,
	className,
	showPercent = false,
	boolean: isBoolean = false,
}: ScoreBadgeProps) {
	if (isBoolean) {
		const passed = score === 1;
		const color: BadgeColor = passed ? 'lime' : 'tomato';
		return (
			<Badge size="xs" color={color} className={cn('tabular-nums', className)}>
				{passed ? 'Pass' : 'Fail'}
			</Badge>
		);
	}
	const color = scoreToColor(score);
	const display = showPercent ? `${(score * 100).toFixed(0)}%` : `${(score * 100).toFixed(1)}%`;
	return (
		<Badge size="xs" color={color} className={cn('tabular-nums', className)}>
			{display}
		</Badge>
	);
}

export function ScoreDot({ score, className }: { score: number; className?: string }) {
	const color = scoreToColor(score);
	return <BadgeDot color={color} className={cn('w-[10px] h-[10px]', className)} />;
}

export function EvaluationTag({ passed, className }: { passed: boolean; className?: string }) {
	const color: BadgeColor = passed ? 'lime' : 'tomato';
	return (
		<Badge size="xs" variant="outline" color={color} className={className}>
			<BadgeDot color={color} />
			{passed ? 'Passed' : 'Failed'}
		</Badge>
	);
}

export function ScoreChange({ value, className }: { value: number; className?: string }) {
	const isPositive = value > 0;
	const isNeutral = value === 0;
	const color = isNeutral
		? 'text-muted-foreground'
		: isPositive
			? 'text-grass-11'
			: 'text-tomato-11';

	return (
		<span className={cn('text-xs font-medium tabular-nums', color, className)}>
			{isPositive ? '+' : ''}
			{(value * 100).toFixed(1)}%
		</span>
	);
}
