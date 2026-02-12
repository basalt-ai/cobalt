import { type VariantProps, cva } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
	'w-fit items-center inline-flex gap-1.5 rounded-lg font-medium transition-colors shrink-0',
	{
		variants: {
			variant: {
				ghost: 'border-transparent',
				outline: 'border',
			},
		},
		size: {},
		defaultVariants: {
			variant: 'ghost',
			size: 'default',
			color: 'sand',
		},
	},
);

const badgeSizeClasses = {
	xs: 'px-1.5 py-0.5 text-xs leading-[18px]',
	sm: 'px-2 py-1 text-sm',
	default: 'px-2 py-1.5 text-sm',
} as const;

const badgeColorClasses = {
	lime: 'bg-lime-3 border-lime-5 text-lime-11',
	brand: 'bg-[var(--brand-3)] border-[var(--brand-5)] text-[var(--brand-12)]',
	tomato: 'bg-tomato-3 border-tomato-5 text-tomato-11',
	blue: 'bg-blue-3 border-blue-5 text-blue-12',
	cyan: 'bg-cyan-3 border-cyan-5 text-cyan-11',
	grass: 'bg-grass-3 border-grass-5 text-grass-11',
	sand: 'bg-sand-3 border-sand-5 text-foreground [&>svg]:text-muted-foreground',
	white: 'bg-white dark:bg-sand-3 border-sand-5 text-foreground [&>svg]:text-muted-foreground',
	orange: 'bg-orange-3 border-orange-5 text-orange-11',
	amber: 'bg-amber-3 border-amber-5 text-amber-11',
} as const;

const badgeDotColorClasses = {
	lime: 'bg-lime-9',
	brand: 'bg-[var(--brand-9)]',
	tomato: 'bg-tomato-9',
	blue: 'bg-blue-9',
	cyan: 'bg-cyan-11',
	grass: 'bg-grass-9',
	sand: 'bg-sand-9',
	white: 'bg-sand-9',
	orange: 'bg-orange-9',
	amber: 'bg-amber-8',
} as const;

export type BadgeColor = keyof typeof badgeColorClasses;
export type BadgeSize = keyof typeof badgeSizeClasses;
export type BadgeVariant = 'ghost' | 'outline';

interface BadgeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
	variant?: BadgeVariant;
	size?: BadgeSize;
	color?: BadgeColor;
}

function Badge({
	className,
	variant = 'ghost',
	size = 'default',
	color = 'sand',
	...props
}: BadgeProps) {
	const outlinePaddingAdjust =
		variant === 'outline'
			? size === 'xs'
				? 'py-[1px]'
				: size === 'sm'
					? 'py-[3px]'
					: 'py-[5px]'
			: '';

	return (
		<div
			className={cn(
				badgeVariants({ variant }),
				badgeSizeClasses[size],
				badgeColorClasses[color],
				outlinePaddingAdjust,
				className,
			)}
			{...props}
		/>
	);
}

function BadgeDot({ color = 'sand', className }: { color?: BadgeColor; className?: string }) {
	return (
		<div className={cn('w-2 h-2 rounded-[2px] shrink-0', badgeDotColorClasses[color], className)} />
	);
}

export { Badge, BadgeDot, badgeVariants, badgeColorClasses, badgeDotColorClasses };
export type { BadgeProps };
