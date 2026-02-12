import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

const RUN_DOT_COLORS = ['bg-[#231F1C] dark:bg-[#faf9f7]', 'bg-blue-600', 'bg-[#CF3897]'] as const;

interface ColumnCellProps {
	children: (ReactNode | null)[];
	className?: string;
}

export function ColumnCell({ children, className }: ColumnCellProps) {
	return (
		<div className={cn('flex flex-col gap-1.5', className)}>
			{children.map((child, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C mapping
				<div key={index} className="flex items-center gap-1.5">
					<div className={cn('w-1.5 h-1.5 rounded-sm shrink-0', RUN_DOT_COLORS[index])} />
					<span className={cn(index === 0 ? 'text-foreground' : 'text-muted-foreground')}>
						{child ?? '-'}
					</span>
				</div>
			))}
		</div>
	);
}
