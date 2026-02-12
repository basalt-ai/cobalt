import { ArrowLeft, Clock } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { compareRuns } from '../api/compare';
import type { CompareResponse } from '../api/types';
import { ColumnCell } from '../components/data/column-cell';
import { type ColumnVisibility, DisplayOptions } from '../components/data/display-options';
import { FilterBar, type FilterDef, type FilterValue } from '../components/data/filter-bar';
import { ScoreBadge, ScoreChange } from '../components/data/score-badge';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useApi } from '../hooks/use-api';
import {
	type ClientStats,
	cn,
	computeClientStats,
	detectBooleanEvaluators,
	formatDuration,
	formatScore,
} from '../lib/utils';

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

	const evaluatorNames = useMemo(() => (data ? Object.keys(data.scoreDiffs) : []), [data]);

	// Detect boolean evaluators from all outputs across all runs
	const booleanEvals = useMemo(() => {
		if (!data) return new Set<string>();
		const allOutputs = data.items.flatMap((item) =>
			item.outputs.filter((o): o is NonNullable<typeof o> => o != null),
		);
		return detectBooleanEvaluators(allOutputs, evaluatorNames);
	}, [data, evaluatorNames]);

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
					const isBool = booleanEvals.has(name);
					return (
						<div key={name} className="rounded-xl border bg-card shadow-sm p-4">
							<p className="text-xs font-medium text-muted-foreground mb-3">
								{name}
								{isBool && (
									<span className="ml-1.5 text-[10px] text-muted-foreground/70">(pass rate)</span>
								)}
							</p>
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
													<ScoreChange value={diff.scores[0] !== 0 ? d / diff.scores[0] : 0} />
												</div>
											),
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Latency & Tokens Stats */}
			<CompareStatsTabs data={data} />

			{/* Items Table */}
			<CompareItemsTable data={data} evaluatorNames={evaluatorNames} booleanEvals={booleanEvals} />
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

function CompareStatsTabs({ data }: { data: CompareResponse }) {
	// Compute per-run latency stats
	const latencyStatsPerRun = useMemo(() => {
		return data.runs.map((_, runIdx) => {
			const latencies = data.items
				.map((item) => item.outputs[runIdx]?.latencyMs)
				.filter((v): v is number => v != null);
			return computeClientStats(latencies);
		});
	}, [data.items, data.runs]);

	// Compute per-run token stats
	const tokenStatsPerRun = useMemo(() => {
		const perRun = data.runs.map((_, runIdx) => {
			const tokens = data.items
				.map((item) => {
					const out = item.outputs[runIdx];
					return out ? getTokens(out.output) : undefined;
				})
				.filter((v): v is number => v != null);
			return tokens.length > 0 ? computeClientStats(tokens) : null;
		});
		return perRun.some((s) => s != null) ? perRun : null;
	}, [data.items, data.runs]);

	return (
		<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
			<Tabs defaultValue="latency">
				<div className="border-b bg-muted/50 px-4 py-2">
					<TabsList>
						<TabsTrigger value="latency">Latency</TabsTrigger>
						{tokenStatsPerRun && <TabsTrigger value="tokens">Tokens</TabsTrigger>}
					</TabsList>
				</div>

				<TabsContent value="latency" className="mt-0">
					<CompareStatsTable
						label="Latency"
						statsPerRun={latencyStatsPerRun}
						format={formatDuration}
					/>
				</TabsContent>

				{tokenStatsPerRun && (
					<TabsContent value="tokens" className="mt-0">
						<CompareStatsTable
							label="Tokens"
							statsPerRun={tokenStatsPerRun}
							format={(v) => Math.round(v).toLocaleString()}
						/>
					</TabsContent>
				)}
			</Tabs>
		</div>
	);
}

function CompareStatsTable({
	label,
	statsPerRun,
	format,
}: {
	label: string;
	statsPerRun: (ClientStats | null)[];
	format: (v: number) => string;
}) {
	const metrics = ['avg', 'min', 'max', 'p50', 'p95', 'p99'] as const;

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b">
						<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">{label}</th>
						{metrics.map((m) => (
							<th key={m} className="px-4 py-2.5 text-right font-medium text-muted-foreground">
								{m === 'avg' ? 'Avg' : m.charAt(0).toUpperCase() + m.slice(1)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{statsPerRun.map((stats, i) => (
						<tr key={RUN_COLORS[i].label} className="border-b last:border-0">
							<td className="px-4 py-2.5 font-medium">
								<div className="flex items-center gap-2">
									<span className={cn('h-2 w-2 rounded-sm', RUN_COLORS[i].fill)} />
									<span>Run {RUN_COLORS[i].label}</span>
								</div>
							</td>
							{metrics.map((m) => (
								<td key={m} className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
									{stats ? format(stats[m]) : '-'}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CompareItemsTable({
	data,
	evaluatorNames,
	booleanEvals,
}: {
	data: CompareResponse;
	evaluatorNames: string[];
	booleanEvals: Set<string>;
}) {
	const [filters, setFilters] = useState<FilterValue[]>([]);
	const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({});

	// Detect which optional columns have data
	const hasTokens = useMemo(
		() =>
			data.items.some((item) => item.outputs.some((out) => out && getTokens(out.output) != null)),
		[data.items],
	);
	const hasMetadata = useMemo(
		() =>
			data.items.some((item) => item.outputs.some((out) => out && getMetadata(out.output) != null)),
		[data.items],
	);

	const filterDefs: FilterDef[] = useMemo(
		() => [
			{ key: 'latencyMs', label: 'Latency (ms)', type: 'number' },
			...evaluatorNames.map((n) => ({
				key: `score_${n}`,
				label: `${n} Score`,
				type: 'number' as const,
			})),
		],
		[evaluatorNames],
	);

	const displayColumns = useMemo(
		() => [
			{ key: 'input', label: 'Input' },
			{ key: 'output', label: 'Output' },
			{ key: 'latency', label: 'Latency' },
			...(hasTokens ? [{ key: 'tokens', label: 'Tokens' }] : []),
			...evaluatorNames.map((n) => ({ key: `eval_${n}`, label: n })),
			...(hasMetadata ? [{ key: 'metadata', label: 'Metadata' }] : []),
		],
		[evaluatorNames, hasTokens, hasMetadata],
	);

	// Apply filters
	const filteredItems = useMemo(() => {
		if (filters.length === 0) return data.items;
		return data.items.filter((item) =>
			filters.every((f) => {
				if (f.key === 'latencyMs') {
					const lat = item.outputs[0]?.latencyMs;
					if (lat == null) return false;
					return applyNumericFilter(lat, f.operator, Number(f.value));
				}
				if (f.key.startsWith('score_')) {
					const evalName = f.key.slice(6);
					const score = item.outputs[0]?.evaluations[evalName]?.score;
					if (score == null) return false;
					return applyNumericFilter(score, f.operator, Number(f.value));
				}
				return true;
			}),
		);
	}, [data.items, filters]);

	// Compute average latency per run
	const avgLatencies = useMemo(() => {
		return data.runs.map((_, runIdx) => {
			const latencies = filteredItems
				.map((item) => item.outputs[runIdx]?.latencyMs)
				.filter((v): v is number => v != null);
			if (latencies.length === 0) return 0;
			return latencies.reduce((a, b) => a + b, 0) / latencies.length;
		});
	}, [filteredItems, data.runs]);

	// Compute average score per evaluator per run
	const avgScores = useMemo(() => {
		const result: Record<string, number[]> = {};
		for (const name of evaluatorNames) {
			result[name] = data.runs.map((_, runIdx) => {
				const scores = filteredItems
					.map((item) => item.outputs[runIdx]?.evaluations[name]?.score)
					.filter((v): v is number => v != null);
				if (scores.length === 0) return 0;
				return scores.reduce((a, b) => a + b, 0) / scores.length;
			});
		}
		return result;
	}, [filteredItems, data.runs, evaluatorNames]);

	const isVisible = (key: string) => columnVisibility[key] !== false;

	return (
		<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
			<div className="border-b bg-muted/50 px-4 py-3 flex items-center justify-between gap-4">
				<h2 className="text-sm font-semibold">
					Items ({filteredItems.length}
					{filteredItems.length !== data.items.length && ` of ${data.items.length}`})
				</h2>
				<div className="flex items-center gap-2">
					<FilterBar filters={filters} onFiltersChange={setFilters} filterDefs={filterDefs} />
					<DisplayOptions
						columns={displayColumns}
						visibility={columnVisibility}
						onVisibilityChange={setColumnVisibility}
					/>
				</div>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-10">#</th>
							{isVisible('input') && (
								<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Input</th>
							)}
							{isVisible('output') && (
								<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Output</th>
							)}
							{isVisible('latency') && (
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
							)}
							{hasTokens && isVisible('tokens') && (
								<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Tokens</th>
							)}
							{evaluatorNames.map((name) =>
								isVisible(`eval_${name}`) ? (
									<th
										key={name}
										className="px-4 py-2.5 text-right font-medium text-muted-foreground"
									>
										<div className="flex flex-col items-end gap-0.5">
											<span>{name}</span>
											<ColumnCell className="items-end">
												{avgScores[name].map((s, i) => (
													<span key={RUN_COLORS[i].label} className="text-[10px] tabular-nums">
														{formatScore(s)}%{booleanEvals.has(name) ? ' pass' : ' avg'}
													</span>
												))}
											</ColumnCell>
										</div>
									</th>
								) : null,
							)}
							{hasMetadata && isVisible('metadata') && (
								<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
									Metadata
								</th>
							)}
						</tr>
					</thead>
					<tbody>
						{filteredItems.map((item) => (
							<tr
								key={item.index}
								className="border-b last:border-0 hover:bg-muted/50 transition-colors"
							>
								<td className="px-4 py-2.5 tabular-nums text-muted-foreground align-top">
									{item.index + 1}
								</td>
								{isVisible('input') && (
									<td className="px-4 py-2.5 max-w-48 align-top">
										<span className="line-clamp-2 text-xs text-muted-foreground">
											{truncateValue(item.input)}
										</span>
									</td>
								)}
								{isVisible('output') && (
									<td className="px-4 py-2.5 max-w-64 align-top">
										<ColumnCell>
											{item.outputs.map((out, idx) => (
												// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C
												<span key={idx} className="line-clamp-2 text-xs">
													{out ? truncateValue(getOutputValue(out.output)) : '-'}
												</span>
											))}
										</ColumnCell>
									</td>
								)}
								{isVisible('latency') && (
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
								)}
								{hasTokens && isVisible('tokens') && (
									<td className="px-4 py-2.5 text-right align-top">
										<ColumnCell className="items-end">
											{item.outputs.map((out, idx) => {
												const tokens = out ? getTokens(out.output) : undefined;
												return (
													// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C
													<span key={idx} className="text-xs tabular-nums text-muted-foreground">
														{tokens != null ? tokens.toLocaleString() : '-'}
													</span>
												);
											})}
										</ColumnCell>
									</td>
								)}
								{evaluatorNames.map((name) =>
									isVisible(`eval_${name}`) ? (
										<td key={name} className="px-4 py-2.5 text-right align-top">
											<ColumnCell className="items-end">
												{item.outputs.map((out, idx) => {
													const ev = out?.evaluations[name];
													return ev ? (
														<ScoreBadge
															// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C
															key={idx}
															score={ev.score}
															boolean={booleanEvals.has(name)}
															reason={ev.reason}
														/>
													) : (
														// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C
														<span key={idx} className="text-muted-foreground text-xs">
															-
														</span>
													);
												})}
											</ColumnCell>
										</td>
									) : null,
								)}
								{hasMetadata && isVisible('metadata') && (
									<td className="px-4 py-2.5 max-w-48 align-top">
										<ColumnCell>
											{item.outputs.map((out, idx) => {
												const meta = out ? getMetadata(out.output) : undefined;
												return (
													// biome-ignore lint/suspicious/noArrayIndexKey: positional A/B/C
													<span key={idx} className="line-clamp-2 text-xs text-muted-foreground">
														{meta ? truncateValue(meta) : '-'}
													</span>
												);
											})}
										</ColumnCell>
									</td>
								)}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function applyNumericFilter(val: number, op: FilterValue['operator'], target: number): boolean {
	switch (op) {
		case 'eq':
			return val === target;
		case 'gt':
			return val > target;
		case 'lt':
			return val < target;
		case 'gte':
			return val >= target;
		case 'lte':
			return val <= target;
		default:
			return true;
	}
}

/** Extract the actual output value from an ExperimentResult or raw value */
function getOutputValue(output: unknown): unknown {
	if (output && typeof output === 'object' && 'output' in output) {
		return (output as { output: unknown }).output;
	}
	return output;
}

/** Extract metadata from an ExperimentResult */
function getMetadata(output: unknown): Record<string, unknown> | undefined {
	if (output && typeof output === 'object' && 'metadata' in output) {
		return (output as { metadata?: Record<string, unknown> }).metadata ?? undefined;
	}
	return undefined;
}

/** Get tokens from item metadata */
function getTokens(output: unknown): number | undefined {
	const meta = getMetadata(output);
	if (!meta) return undefined;
	const tokens = meta.tokens;
	return typeof tokens === 'number' ? tokens : undefined;
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
			<Skeleton className="h-48 rounded-xl" />
			<Skeleton className="h-64 rounded-xl" />
		</div>
	);
}
