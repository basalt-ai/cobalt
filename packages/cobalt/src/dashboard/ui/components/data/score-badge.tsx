import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';
import type { BadgeColor } from '../ui/badge';
import { Badge, BadgeDot } from '../ui/badge';

interface ScoreBadgeProps {
	score: number;
	className?: string;
	showPercent?: boolean;
	boolean?: boolean;
	reason?: string;
}

function scoreToColor(score: number): BadgeColor {
	if (score >= 0.9) return 'grass';
	if (score >= 0.8) return 'orange';
	if (score >= 0.7) return 'amber';
	return 'tomato';
}

function WithReasonTooltip({
	reason,
	children,
}: {
	reason?: string;
	children: React.ReactElement;
}) {
	if (!reason) return children;

	return (
		<TooltipPrimitive.Provider delayDuration={200}>
			<TooltipPrimitive.Root>
				<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
				<TooltipPrimitive.Portal>
					<TooltipPrimitive.Content
						sideOffset={4}
						className="z-50 max-w-xs overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-fade-in"
					>
						{reason}
					</TooltipPrimitive.Content>
				</TooltipPrimitive.Portal>
			</TooltipPrimitive.Root>
		</TooltipPrimitive.Provider>
	);
}

export function ScoreBadge({
	score,
	className,
	showPercent = false,
	boolean: isBoolean = false,
	reason,
}: ScoreBadgeProps) {
	if (isBoolean && !showPercent) {
		const passed = score === 1;
		const color: BadgeColor = passed ? 'grass' : 'tomato';
		const badge = (
			<Badge
				size="xs"
				variant="outline"
				color={color}
				className={cn('bg-transparent text-foreground tabular-nums', className)}
			>
				<BadgeDot color={color} />
				{passed ? 'Passed' : 'Failed'}
			</Badge>
		);
		return <WithReasonTooltip reason={reason}>{badge}</WithReasonTooltip>;
	}
	const color = scoreToColor(score);
	const display = showPercent ? `${(score * 100).toFixed(0)}%` : `${(score * 100).toFixed(1)}%`;
	const badge = (
		<Badge
			size="xs"
			variant="outline"
			color={color}
			className={cn('bg-transparent text-foreground tabular-nums', className)}
		>
			<BadgeDot color={color} />
			{display}
		</Badge>
	);
	return <WithReasonTooltip reason={reason}>{badge}</WithReasonTooltip>;
}

export function ScoreDot({ score, className }: { score: number; className?: string }) {
	const color = scoreToColor(score);
	return <BadgeDot color={color} className={cn('w-[10px] h-[10px]', className)} />;
}

export function EvaluationTag({ passed, className }: { passed: boolean; className?: string }) {
	const color: BadgeColor = passed ? 'grass' : 'tomato';
	return (
		<Badge
			size="xs"
			variant="outline"
			color={color}
			className={cn('bg-transparent text-foreground', className)}
		>
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
