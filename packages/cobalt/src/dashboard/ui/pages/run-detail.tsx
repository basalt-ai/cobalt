import { ArrowLeft, CheckCircle, Clock, Warning, XCircle } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getRunDetail } from '../api/runs';
import type { ItemResult, RunDetailResponse } from '../api/types';
import { FilterBar, type FilterDef, type FilterValue } from '../components/data/filter-bar';
import { MetricCard } from '../components/data/metric-card';
import { ScoreBadge } from '../components/data/score-badge';
import { PageHeader } from '../components/layout/page-header';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useApi } from '../hooks/use-api';
import {
	type ClientStats,
	cn,
	computeClientStats,
	formatDate,
	formatDuration,
	formatScore,
} from '../lib/utils';

export function RunDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { data, error, loading } = useApi<RunDetailResponse>(() => getRunDetail(id!), [id]);
	const [selectedItem, setSelectedItem] = useState<ItemResult | null>(null);

	if (loading) return <LoadingSkeleton />;
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<p className="text-sm text-destructive">Failed to load run: {error.message}</p>
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
	if (!data?.run) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<p className="text-lg font-medium">Run not found</p>
			</div>
		);
	}

	const { run } = data;
	const evaluatorNames = Object.keys(run.summary.scores);

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

			<PageHeader title={run.name} description={`${formatDate(run.timestamp)} — Run ${run.id}`}>
				{run.tags.length > 0 && (
					<div className="flex gap-1.5">
						{run.tags.map((tag) => (
							<Badge key={tag} color="sand" size="sm">
								{tag}
							</Badge>
						))}
					</div>
				)}
			</PageHeader>

			{/* Metric Cards */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<MetricCard label="Items" value={run.summary.totalItems} />
				<MetricCard
					label="Duration"
					value={formatDuration(run.summary.totalDurationMs)}
					detail={`avg ${formatDuration(run.summary.avgLatencyMs)}/item`}
				/>
				{run.summary.totalTokens != null && (
					<MetricCard label="Tokens" value={run.summary.totalTokens.toLocaleString()} />
				)}
				{run.summary.estimatedCost != null && (
					<MetricCard label="Cost" value={`$${run.summary.estimatedCost.toFixed(4)}`} />
				)}
			</div>

			{/* CI Status */}
			{run.ciStatus && (
				<div
					className={cn(
						'rounded-xl border p-4',
						run.ciStatus.passed ? 'border-lime-5 bg-lime-3' : 'border-tomato-5 bg-tomato-3',
					)}
				>
					<div className="flex items-center gap-2">
						{run.ciStatus.passed ? (
							<CheckCircle weight="fill" className="h-5 w-5 text-grass-11" />
						) : (
							<XCircle weight="fill" className="h-5 w-5 text-tomato-11" />
						)}
						<span className="font-medium">CI: {run.ciStatus.passed ? 'Passed' : 'Failed'}</span>
					</div>
					{run.ciStatus.violations.length > 0 && (
						<ul className="mt-2 space-y-1 pl-7">
							{run.ciStatus.violations.map((v) => (
								<li key={`${v.evaluator}-${v.metric}`} className="text-sm text-muted-foreground">
									{v.message}
								</li>
							))}
						</ul>
					)}
				</div>
			)}

			{/* Metrics Tabs */}
			<MetricsTabs run={data.run} evaluatorNames={evaluatorNames} />

			{/* Items Table */}
			<ItemsTable run={data.run} evaluatorNames={evaluatorNames} onItemClick={setSelectedItem} />

			{/* Item Detail Dialog */}
			<ItemDetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
		</div>
	);
}

function MetricsTabs({
	run,
	evaluatorNames,
}: {
	run: RunDetailResponse['run'];
	evaluatorNames: string[];
}) {
	const latencyStats = useMemo(
		() => computeClientStats(run.items.map((i) => i.latencyMs)),
		[run.items],
	);

	return (
		<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
			<Tabs defaultValue="scores">
				<div className="border-b bg-muted/50 px-4 py-2">
					<TabsList>
						<TabsTrigger value="scores">Scores</TabsTrigger>
						<TabsTrigger value="latency">Latency</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="scores" className="mt-0">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
										Evaluator
									</th>
									<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Avg</th>
									<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Min</th>
									<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Max</th>
									<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">P50</th>
									<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">P95</th>
									<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">P99</th>
								</tr>
							</thead>
							<tbody>
								{Object.entries(run.summary.scores).map(([name, stats]) => (
									<tr key={name} className="border-b last:border-0">
										<td className="px-4 py-2.5 font-medium">{name}</td>
										<td className="px-4 py-2.5 text-right">
											<ScoreBadge score={stats.avg} />
										</td>
										<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
											{formatScore(stats.min)}%
										</td>
										<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
											{formatScore(stats.max)}%
										</td>
										<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
											{formatScore(stats.p50)}%
										</td>
										<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
											{formatScore(stats.p95)}%
										</td>
										<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
											{stats.p99 != null ? `${formatScore(stats.p99)}%` : '-'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</TabsContent>

				<TabsContent value="latency" className="mt-0">
					<LatencyStatsTable stats={latencyStats} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function LatencyStatsTable({ stats }: { stats: ClientStats }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b">
						<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Metric</th>
						<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Avg</th>
						<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Min</th>
						<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Max</th>
						<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">P50</th>
						<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">P95</th>
						<th className="px-4 py-2.5 text-right font-medium text-muted-foreground">P99</th>
					</tr>
				</thead>
				<tbody>
					<tr className="border-b last:border-0">
						<td className="px-4 py-2.5 font-medium">Latency</td>
						<td className="px-4 py-2.5 text-right tabular-nums">{formatDuration(stats.avg)}</td>
						<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
							{formatDuration(stats.min)}
						</td>
						<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
							{formatDuration(stats.max)}
						</td>
						<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
							{formatDuration(stats.p50)}
						</td>
						<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
							{formatDuration(stats.p95)}
						</td>
						<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
							{formatDuration(stats.p99)}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}

function ItemsTable({
	run,
	evaluatorNames,
	onItemClick,
}: {
	run: RunDetailResponse['run'];
	evaluatorNames: string[];
	onItemClick: (item: ItemResult) => void;
}) {
	const [filters, setFilters] = useState<FilterValue[]>([]);

	const filterDefs: FilterDef[] = useMemo(
		() => [
			{ key: 'latencyMs', label: 'Latency (ms)', type: 'number' },
			{ key: 'hasError', label: 'Has Error', type: 'boolean' },
			...evaluatorNames.map((n) => ({
				key: `score_${n}`,
				label: `${n} Score`,
				type: 'number' as const,
			})),
		],
		[evaluatorNames],
	);

	// Apply filters to items
	const filteredItems = useMemo(() => {
		if (filters.length === 0) return run.items;
		return run.items.filter((item) =>
			filters.every((f) => {
				if (f.key === 'hasError') {
					const hasErr = !!item.error;
					return String(hasErr) === f.value;
				}
				if (f.key === 'latencyMs') {
					return applyNumericFilter(item.latencyMs, f.operator, Number(f.value));
				}
				if (f.key.startsWith('score_')) {
					const evalName = f.key.slice(6);
					const score = item.evaluations[evalName]?.score;
					if (score == null) return false;
					return applyNumericFilter(score, f.operator, Number(f.value));
				}
				return true;
			}),
		);
	}, [run.items, filters]);

	// Compute AVG scores per evaluator for header
	const evaluatorAvgs = useMemo(() => {
		const avgs: Record<string, number> = {};
		for (const name of evaluatorNames) {
			const scores = filteredItems
				.map((item) => item.evaluations[name]?.score)
				.filter((s): s is number => s != null);
			avgs[name] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
		}
		return avgs;
	}, [filteredItems, evaluatorNames]);

	// Compute avg latency for header
	const avgLatency = useMemo(() => {
		if (filteredItems.length === 0) return 0;
		return filteredItems.reduce((sum, i) => sum + i.latencyMs, 0) / filteredItems.length;
	}, [filteredItems]);

	const hasErrors = filteredItems.some((item) => item.error);

	return (
		<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
			<div className="border-b bg-muted/50 px-4 py-3 flex items-center justify-between gap-4">
				<h2 className="text-sm font-semibold">
					Items ({filteredItems.length}
					{filteredItems.length !== run.items.length && ` of ${run.items.length}`})
				</h2>
				<FilterBar filters={filters} onFiltersChange={setFilters} filterDefs={filterDefs} />
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
									<span className="text-[10px] tabular-nums">{formatDuration(avgLatency)}</span>
								</div>
							</th>
							{evaluatorNames.map((name) => (
								<th key={name} className="px-4 py-2.5 text-right font-medium text-muted-foreground">
									<div className="flex flex-col items-end gap-0.5">
										<span>{name}</span>
										<ScoreBadge score={evaluatorAvgs[name]} />
									</div>
								</th>
							))}
							{hasErrors && (
								<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Error</th>
							)}
						</tr>
					</thead>
					<tbody>
						{filteredItems.map((item) => (
							<tr
								key={item.index}
								className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
								onClick={() => onItemClick(item)}
								onKeyDown={(e) => e.key === 'Enter' && onItemClick(item)}
							>
								<td className="px-4 py-2.5 tabular-nums text-muted-foreground">{item.index + 1}</td>
								<td className="px-4 py-2.5 max-w-48">
									<span className="line-clamp-2 text-xs text-muted-foreground">
										{truncateValue(item.input)}
									</span>
								</td>
								<td className="px-4 py-2.5 max-w-48">
									<span className="line-clamp-2 text-xs">{truncateValue(item.output)}</span>
								</td>
								<td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
									{formatDuration(item.latencyMs)}
								</td>
								{evaluatorNames.map((name) => (
									<td key={name} className="px-4 py-2.5 text-right">
										{item.evaluations[name] ? (
											<ScoreBadge score={item.evaluations[name].score} />
										) : (
											<span className="text-muted-foreground">-</span>
										)}
									</td>
								))}
								{hasErrors && (
									<td className="px-4 py-2.5">
										{item.error && (
											<Badge color="tomato" size="xs" variant="outline">
												<Warning className="h-3 w-3 mr-0.5" />
												Error
											</Badge>
										)}
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

function ItemDetailDialog({
	item,
	onClose,
}: {
	item: ItemResult | null;
	onClose: () => void;
}) {
	if (!item) return null;

	return (
		<Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Item #{item.index + 1}</DialogTitle>
					<DialogDescription>Latency: {formatDuration(item.latencyMs)}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div>
						<h4 className="text-xs font-medium text-muted-foreground mb-1">Input</h4>
						<pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap">
							{JSON.stringify(item.input, null, 2)}
						</pre>
					</div>

					<div>
						<h4 className="text-xs font-medium text-muted-foreground mb-1">Output</h4>
						<pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap">
							{typeof item.output === 'string' ? item.output : JSON.stringify(item.output, null, 2)}
						</pre>
					</div>

					{item.error && (
						<div>
							<h4 className="text-xs font-medium text-tomato-11 mb-1">Error</h4>
							<pre className="rounded-lg bg-tomato-3 p-3 text-xs text-tomato-12 overflow-x-auto">
								{item.error}
							</pre>
						</div>
					)}

					<div>
						<h4 className="text-xs font-medium text-muted-foreground mb-2">Evaluations</h4>
						<div className="space-y-2">
							{Object.entries(item.evaluations).map(([name, ev]) => (
								<div key={name} className="rounded-lg border p-3">
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium">{name}</span>
										<ScoreBadge score={ev.score} />
									</div>
									{ev.reason && <p className="mt-1.5 text-xs text-muted-foreground">{ev.reason}</p>}
								</div>
							))}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
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

function truncateValue(value: unknown): string {
	if (typeof value === 'string') return value;
	const str = JSON.stringify(value);
	return str.length > 120 ? `${str.slice(0, 120)}...` : str;
}

function LoadingSkeleton() {
	return (
		<div className="space-y-6">
			<Skeleton className="h-4 w-24" />
			<Skeleton className="h-8 w-64" />
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
					<Skeleton key={i} className="h-24 rounded-xl" />
				))}
			</div>
			<Skeleton className="h-48 rounded-xl" />
			<Skeleton className="h-64 rounded-xl" />
		</div>
	);
}
