import { ArrowLeft } from '@phosphor-icons/react';
import { Link, useSearchParams } from 'react-router';
import { compareRuns } from '../api/compare';
import type { CompareResponse } from '../api/types';
import { MetricCard } from '../components/data/metric-card';
import { ScoreBadge, ScoreChange } from '../components/data/score-badge';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useApi } from '../hooks/use-api';
import { cn } from '../lib/utils';

const RUN_COLORS = {
	a: {
		label: 'A',
		fill: 'bg-[#231f1c] dark:bg-[#faf9f7]',
		text: 'text-[#231f1c] dark:text-[#faf9f7]',
		bg: 'bg-[#faf9f7] dark:bg-[#231f1c]',
		dot: 'bg-gray-500',
	},
	b: {
		label: 'B',
		fill: 'bg-blue-600 dark:bg-blue-400',
		text: 'text-blue-600 dark:text-blue-400',
		bg: 'bg-blue-50 dark:bg-blue-950',
		dot: 'bg-blue-500',
	},
} as const;

export function ComparePage() {
	const [searchParams] = useSearchParams();
	const a = searchParams.get('a');
	const b = searchParams.get('b');

	const { data, error, loading } = useApi<CompareResponse>(() => {
		if (!a || !b) return Promise.reject(new Error('Missing run IDs'));
		return compareRuns(a, b);
	}, [a, b]);

	if (!a || !b) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<p className="text-lg font-medium">Select two runs to compare</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Go back to the runs list and select runs using checkboxes
				</p>
				<Link to="/">
					<Button variant="outline" size="sm" className="mt-4">
						Back to runs
					</Button>
				</Link>
			</div>
		);
	}

	if (loading) return <LoadingSkeleton />;
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<p className="text-sm text-destructive">Failed to compare runs: {error.message}</p>
				<Button
					variant="outline"
					size="sm"
					className="mt-4"
					onClick={() => window.location.reload()}
				>
					Retry
				</Button>
			</div>
		);
	}
	if (!data) return null;

	const evaluatorNames = Object.keys(data.scoreDiffs);

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Link
				to="/"
				className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to runs
			</Link>

			<PageHeader title="Compare Runs" />

			{/* Run labels */}
			<div className="flex flex-wrap gap-4">
				<RunLabel run={data.runA} color={RUN_COLORS.a} label="Base" />
				<span className="self-center text-muted-foreground text-sm">vs</span>
				<RunLabel run={data.runB} color={RUN_COLORS.b} label="Candidate" />
			</div>

			{/* Score Comparison Cards */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{evaluatorNames.map((name) => {
					const diff = data.scoreDiffs[name];
					return (
						<div key={name} className="rounded-xl border bg-card shadow-sm p-4">
							<p className="text-xs font-medium text-muted-foreground mb-3">{name}</p>
							<div className="space-y-2">
								<ScoreRow label="A" score={diff.baseline} color={RUN_COLORS.a} />
								<ScoreRow label="B" score={diff.candidate} color={RUN_COLORS.b} />
							</div>
							<div className="mt-3 pt-2 border-t flex items-center justify-between">
								<span className="text-xs text-muted-foreground">Change</span>
								<ScoreChange value={diff.diff} />
							</div>
						</div>
					);
				})}
			</div>

			{/* Top Changes Table */}
			{data.topChanges.length > 0 && (
				<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
					<div className="border-b bg-muted/50 px-4 py-3">
						<h2 className="text-sm font-semibold">Top Item Changes ({data.topChanges.length})</h2>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-10">
										#
									</th>
									<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Input</th>
									{evaluatorNames.map((name) => (
										<th
											key={name}
											className="px-4 py-2.5 text-right font-medium text-muted-foreground"
										>
											{name}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{data.topChanges.map((change) => (
									<tr
										key={change.index}
										className="border-b last:border-0 hover:bg-muted/50 transition-colors"
									>
										<td className="px-4 py-2.5 tabular-nums text-muted-foreground">
											{change.index + 1}
										</td>
										<td className="px-4 py-2.5 max-w-64">
											<span className="line-clamp-2 text-xs text-muted-foreground">
												{truncateValue(change.input)}
											</span>
										</td>
										{evaluatorNames.map((name) => {
											const delta = change.changes[name];
											return (
												<td key={name} className="px-4 py-2.5 text-right">
													{delta != null ? (
														<ScoreChange value={delta} />
													) : (
														<span className="text-muted-foreground">-</span>
													)}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}

function RunLabel({
	run,
	color,
	label,
}: {
	run: { id: string; name: string; timestamp: string };
	color: (typeof RUN_COLORS)[keyof typeof RUN_COLORS];
	label: string;
}) {
	return (
		<div className={cn('rounded-lg border px-3 py-2', color.bg)}>
			<div className="flex items-center gap-2">
				<span
					className={cn(
						'inline-flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-white',
						color.fill,
					)}
				>
					{color.label}
				</span>
				<div>
					<p className="text-sm font-medium">
						{label}: {run.name}
					</p>
					<p className="text-xs text-muted-foreground">{run.id.slice(0, 8)}</p>
				</div>
			</div>
		</div>
	);
}

function ScoreRow({
	label,
	score,
	color,
}: {
	label: string;
	score: number;
	color: (typeof RUN_COLORS)[keyof typeof RUN_COLORS];
}) {
	return (
		<div className="flex items-center gap-2">
			<span className={cn('h-2 w-2 rounded-full', color.dot)} />
			<span className="text-xs text-muted-foreground w-3">{label}</span>
			<div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
				<div
					className={cn('h-full rounded-full transition-all', color.dot)}
					style={{ width: `${Math.max(score * 100, 2)}%` }}
				/>
			</div>
			<ScoreBadge score={score} className="ml-1" />
		</div>
	);
}

function truncateValue(value: unknown): string {
	if (typeof value === 'string') return value;
	const str = JSON.stringify(value);
	return str.length > 120 ? `${str.slice(0, 120)}...` : str;
}

function LoadingSkeleton() {
	return (
		<div className="space-y-6">
			<Skeleton className="h-4 w-24" />
			<Skeleton className="h-8 w-48" />
			<div className="flex gap-4">
				<Skeleton className="h-16 w-48" />
				<Skeleton className="h-16 w-48" />
			</div>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
					<Skeleton key={i} className="h-36 rounded-xl" />
				))}
			</div>
			<Skeleton className="h-48 rounded-xl" />
		</div>
	);
}
