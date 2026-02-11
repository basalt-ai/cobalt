import { cn } from '../../lib/utils';

interface MetricCardProps {
	label: string;
	value: string | number;
	detail?: string;
	className?: string;
}

export function MetricCard({ label, value, detail, className }: MetricCardProps) {
	return (
		<div className={cn('rounded-xl border bg-card p-4 shadow-sm', className)}>
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
			{detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
		</div>
	);
}
