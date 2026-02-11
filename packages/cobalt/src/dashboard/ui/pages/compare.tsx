import { ArrowLeft, Clock } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { compareRuns } from '../api/compare';
import type { CompareResponse } from '../api/types';
import { ColumnCell } from '../components/data/column-cell';
import { ScoreBadge, ScoreChange } from '../components/data/score-badge';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useApi } from '../hooks/use-api';
import { cn, formatDuration } from '../lib/utils';

const RUN_COLORS = [
	{
		label: 'A',
		fill: 'bg-[#231F1C] dark:bg-[#faf9f7]',
		text: 'text-[#231F1C] dark:text-[#faf9f7]',
		bg: 'bg-[#FAF9F7] dark:bg-[#231F1C]',
		border: 'border-[#E4E0DD] dark:border-[#3a3633]',
	},
	{
		label: 'B',
		fill: 'bg-[#3358D4]',
		text: 'text-[#3358D4]',
		bg: 'bg-[#F7F9FF] dark:bg-blue-950',
		border: 'border-[#D2DEFF] dark:border-blue-800',
	},
	{
		label: 'C',
		fill: 'bg-[#CF3897]',
		text: 'text-[#CF3897]',
		bg: 'bg-[#FEF7FB] dark:bg-pink-950',
		border: 'border-[#F6CEE7] dark:border-pink-800',
	},
] as const;

export function ComparePage() {
	const [searchParams] = useSearchParams();
	const a = searchParams.get('a');
	const b = searchParams.get('b');
	const c = searchParams.get('c');

	const runIds = useMemo(() => {
		const ids = [a, b].filter(Boolean) as string[];
		if (c) ids.push(c);
		return ids;
	}, [a, b, c]);

	const { data, error, loading } = useApi<CompareResponse>(() => {
		if (runIds.length < 2) return Promise.reject(new Error('Missing run IDs'));
		return compareRuns(runIds);
	}, [runIds]);

	if (runIds.length < 2) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<p className="text-lg font-medium">Select two or three runs to compare</p>
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
			<div className="flex flex-wrap gap-3">
				{data.runs.map((run, i) => (
					<RunLabel
						key={run.id}
						run={run}
						color={RUN_COLORS[i]}
						label={
							i === 0 ? 'Base' : `Candidate ${data.runs.length > 2 ? RUN_COLORS[i].label : ''}`
						}
					/>
				))}
			</div>

			{/* Score Comparison Cards */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{evaluatorNames.map((name) => {
					const diff = data.scoreDiffs[name];
					return (
						<div key={name} className="rounded-xl border bg-card shadow-sm p-4">
							<p className="text-xs font-medium text-muted-foreground mb-3">{name}</p>
							<div className="space-y-2">
								{diff.scores.map((score, i) => (
									<ScoreRow
										key={RUN_COLORS[i].label}
										label={RUN_COLORS[i].label}
										score={score}
										color={RUN_COLORS[i]}
									/>
								))}
							</div>
							{diff.diffs.some((d) => d !== 0) && (
								<div className="mt-3 pt-2 border-t">
									{diff.diffs.map(
										(d, i) =>
											i > 0 && (
												<div
													key={RUN_COLORS[i].label}
													className="flex items-center justify-between"
												>
													<span className="text-xs text-muted-foreground">
														{RUN_COLORS[i].label} vs A
													</span>
													<ScoreChange value={d * 100} />
												</div>
											),
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Items Table */}
			<CompareItemsTable data={data} evaluatorNames={evaluatorNames} />
		</div>
	);
}

function RunLabel({
	run,
	color,
	label,
}: {
	run: { id: string; name: string; timestamp: string };
	color: (typeof RUN_COLORS)[number];
	label: string;
}) {
	return (
		<div className={cn('rounded-lg border px-3 py-2', color.bg, color.border)}>
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
	color: (typeof RUN_COLORS)[number];
}) {
	return (
		<div className="flex items-center gap-2">
			<span className={cn('h-2 w-2 rounded-sm', color.fill)} />
			<span className="text-xs text-muted-foreground w-3">{label}</span>
			<div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
				<div
					className={cn('h-full rounded-full transition-all', color.fill)}
					style={{ width: `${Math.max(score * 100, 2)}%` }}
				/>
			</div>
			<ScoreBadge score={score} className="ml-1" />
		</div>
	);
}

function CompareItemsTable({
	data,
	evaluatorNames,
}: {
	data: CompareResponse;
	evaluatorNames: string[];
}) {
	// Compute average latency per run
	const avgLatencies = useMemo(() => {
		return data.runs.map((_, runIdx) => {
			const latencies = data.items
				.map((item) => item.outputs[runIdx]?.latencyMs)
				.filter((v): v is number => v != null);
			if (latencies.length === 0) return 0;
			return latencies.reduce((a, b) => a + b, 0) / latencies.length;
		});
	}, [data.items, data.runs]);

	// Compute average score per evaluator per run
	const avgScores = useMemo(() => {
		const result: Record<string, number[]> = {};
		for (const name of evaluatorNames) {
			result[name] = data.runs.map((_, runIdx) => {
				const scores = data.items
					.map((item) => item.outputs[runIdx]?.evaluations[name]?.score)
					.filter((v): v is number => v != null);
				if (scores.length === 0) return 0;
				return scores.reduce((a, b) => a + b, 0) / scores.length;
			});
		}
		return result;
	}, [data.items, data.runs, evaluatorNames]);

	return (
		<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
			<div className="border-b bg-muted/50 px-4 py-3">
				<h2 className="text-sm font-semibold">Items ({data.items.length})</h2>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-10">#</th>
							<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Input</th>
							<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Output</th>
							<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
								<div className="flex flex-col items-end gap-0.5">
									<Clock className="inline h-3.5 w-3.5" />
									<ColumnCell className="items-end">
										{avgLatencies.map((lat, idx) => (
											// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C
											<span key={idx} className="text-[10px] tabular-nums">
												{formatDuration(lat)}
											</span>
										))}
									</ColumnCell>
								</div>
							</th>
							{evaluatorNames.map((name) => (
								<th key={name} className="px-4 py-2.5 text-right font-medium text-muted-foreground">
									<div className="flex flex-col items-end gap-0.5">
										<span>{name}</span>
										<ColumnCell className="items-end">
											{avgScores[name].map((s, i) => (
												<ScoreBadge key={RUN_COLORS[i].label} score={s} />
											))}
										</ColumnCell>
									</div>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.items.map((item) => (
							<tr
								key={item.index}
								className="border-b last:border-0 hover:bg-muted/50 transition-colors"
							>
								<td className="px-4 py-2.5 tabular-nums text-muted-foreground align-top">
									{item.index + 1}
								</td>
								<td className="px-4 py-2.5 max-w-48 align-top">
									<span className="line-clamp-2 text-xs text-muted-foreground">
										{truncateValue(item.input)}
									</span>
								</td>
								<td className="px-4 py-2.5 max-w-64 align-top">
									<ColumnCell>
										{item.outputs.map((out, idx) => (
											// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C
											<span key={idx} className="line-clamp-2 text-xs">
												{out ? truncateValue(out.output) : '-'}
											</span>
										))}
									</ColumnCell>
								</td>
								<td className="px-4 py-2.5 text-right align-top whitespace-nowrap">
									<ColumnCell className="items-end">
										{item.outputs.map((out, idx) => (
											// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C
											<span key={idx} className="text-xs tabular-nums">
												{out ? formatDuration(out.latencyMs) : '-'}
											</span>
										))}
									</ColumnCell>
								</td>
								{evaluatorNames.map((name) => (
									<td key={name} className="px-4 py-2.5 text-right align-top">
										<ColumnCell className="items-end">
											{item.outputs.map((out, idx) => {
												const ev = out?.evaluations[name];
												return ev ? (
													// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C
													<ScoreBadge key={idx} score={ev.score} />
												) : (
													// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C
													<span key={idx} className="text-muted-foreground text-xs">
														-
													</span>
												);
											})}
										</ColumnCell>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
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
			<div className="flex gap-3">
				<Skeleton className="h-16 w-56" />
				<Skeleton className="h-16 w-56" />
			</div>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
					<Skeleton key={i} className="h-36 rounded-xl" />
				))}
			</div>
			<Skeleton className="h-64 rounded-xl" />
		</div>
	);
}
