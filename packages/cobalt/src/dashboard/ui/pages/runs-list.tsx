import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { getRuns } from '../api/runs';
import type { ResultSummary, RunsResponse } from '../api/types';
import { type ColumnVisibility, DisplayOptions } from '../components/data/display-options';
import {
	FilterBar,
	type FilterDef,
	type FilterValue,
	applyFilters,
} from '../components/data/filter-bar';
import { ScoreBadge } from '../components/data/score-badge';
import { PageHeader } from '../components/layout/page-header';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useApi } from '../hooks/use-api';
import { cn, formatDuration, formatRelativeTime } from '../lib/utils';

type SortKey = 'name' | 'timestamp' | 'totalItems' | 'durationMs';
type SortDir = 'asc' | 'desc';

export function RunsListPage() {
	const { data, error, loading } = useApi<RunsResponse>(() => getRuns());
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [sortKey, setSortKey] = useState<SortKey>('timestamp');
	const [sortDir, setSortDir] = useState<SortDir>('desc');
	const [filters, setFilters] = useState<FilterValue[]>([]);
	const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({});
	const navigate = useNavigate();

	function handleSort(key: SortKey) {
		if (sortKey === key) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortKey(key);
			setSortDir('desc');
		}
	}

	function toggleSelect(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else if (next.size < 3) {
				next.add(id);
			}
			return next;
		});
	}

	function handleCompare() {
		const ids = Array.from(selected);
		if (ids.length >= 2) {
			navigate(`/compare?a=${ids[0]}&b=${ids[1]}${ids[2] ? `&c=${ids[2]}` : ''}`);
		}
	}

	if (loading) return <LoadingSkeleton />;
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<p className="text-sm text-destructive">Failed to load runs: {error.message}</p>
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
	if (!data?.runs.length) {
		return (
			<div className="flex flex-col items-center justify-center py-20 text-center">
				<p className="text-lg font-medium">No experiment runs found</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Run your first experiment with{' '}
					<code className="rounded bg-muted px-1.5 py-0.5 text-xs">cobalt run</code>
				</p>
			</div>
		);
	}

	const evaluatorNames = getEvaluatorNames(data.runs);

	// Build filter definitions from available data
	const allTags = useMemo(() => {
		const tags = new Set<string>();
		for (const run of data.runs) {
			for (const tag of run.tags) tags.add(tag);
		}
		return Array.from(tags);
	}, [data.runs]);

	const filterDefs: FilterDef[] = useMemo(
		() => [
			{ key: 'name', label: 'Name', type: 'text' },
			...(allTags.length > 0
				? [{ key: 'tags', label: 'Tag', type: 'select' as const, options: allTags }]
				: []),
			{ key: 'totalItems', label: 'Items', type: 'number' },
			{ key: 'durationMs', label: 'Duration (ms)', type: 'number' },
		],
		[allTags],
	);

	const displayColumns = useMemo(
		() => [
			{ key: 'date', label: 'Date' },
			{ key: 'items', label: 'Items' },
			{ key: 'duration', label: 'Duration' },
			...evaluatorNames.map((n) => ({ key: `score_${n}`, label: n })),
			{ key: 'tags', label: 'Tags' },
		],
		[evaluatorNames],
	);

	// Apply search, filters, and sort
	const filtered = useMemo(() => {
		let result = data.runs.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

		// Apply tag filters specially (check if any tag matches)
		const tagFilters = filters.filter((f) => f.key === 'tags');
		const otherFilters = filters.filter((f) => f.key !== 'tags');

		if (tagFilters.length > 0) {
			result = result.filter((r) =>
				tagFilters.every((f) =>
					r.tags.some((t) => t.toLowerCase().includes(f.value.toLowerCase())),
				),
			);
		}

		result = applyFilters(result, otherFilters);

		result.sort((a, b) => {
			const dir = sortDir === 'asc' ? 1 : -1;
			if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
			if (sortKey === 'timestamp')
				return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * dir;
			if (sortKey === 'totalItems') return (a.totalItems - b.totalItems) * dir;
			if (sortKey === 'durationMs') return (a.durationMs - b.durationMs) * dir;
			return 0;
		});

		return result;
	}, [data.runs, search, filters, sortKey, sortDir]);

	return (
		<div className="space-y-4">
			<PageHeader title="Experiment Runs" description={`${data.runs.length} runs recorded`}>
				<div className="flex items-center gap-2">
					<div className="relative">
						<MagnifyingGlass className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<input
							type="text"
							placeholder="Search experiments..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="h-9 w-56 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
					</div>
					<DisplayOptions
						columns={displayColumns}
						visibility={columnVisibility}
						onVisibilityChange={setColumnVisibility}
					/>
				</div>
			</PageHeader>

			{/* Filter Bar */}
			<FilterBar filters={filters} onFiltersChange={setFilters} filterDefs={filterDefs} />

			<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/50">
								<th className="w-10 px-3 py-3">
									<span className="sr-only">Select</span>
								</th>
								<SortableHeader
									label="Name"
									sortKey="name"
									currentKey={sortKey}
									dir={sortDir}
									onSort={handleSort}
								/>
								{columnVisibility.date !== false && (
									<SortableHeader
										label="Date"
										sortKey="timestamp"
										currentKey={sortKey}
										dir={sortDir}
										onSort={handleSort}
									/>
								)}
								{columnVisibility.items !== false && (
									<SortableHeader
										label="Items"
										sortKey="totalItems"
										currentKey={sortKey}
										dir={sortDir}
										onSort={handleSort}
										className="text-right"
									/>
								)}
								{columnVisibility.duration !== false && (
									<SortableHeader
										label="Duration"
										sortKey="durationMs"
										currentKey={sortKey}
										dir={sortDir}
										onSort={handleSort}
										className="text-right"
									/>
								)}
								{evaluatorNames.map((name) =>
									columnVisibility[`score_${name}`] !== false ? (
										<th
											key={name}
											className="px-3 py-3 text-right font-medium text-muted-foreground"
										>
											{name}
										</th>
									) : null,
								)}
								{columnVisibility.tags !== false && (
									<th className="px-3 py-3 font-medium text-muted-foreground">Tags</th>
								)}
								<th className="w-10 px-3 py-3" />
							</tr>
						</thead>
						<tbody>
							{filtered.map((run) => (
								<tr
									key={run.id}
									className={cn(
										'border-b last:border-0 transition-colors hover:bg-muted/50 cursor-pointer',
										selected.has(run.id) && 'bg-accent/50',
									)}
									onClick={() => navigate(`/runs/${run.id}`)}
									onKeyDown={(e) => e.key === 'Enter' && navigate(`/runs/${run.id}`)}
								>
									{/* biome-ignore lint/a11y/useKeyWithClickEvents: checkbox handles keyboard */}
									<td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
										<input
											type="checkbox"
											checked={selected.has(run.id)}
											onChange={() => toggleSelect(run.id)}
											disabled={!selected.has(run.id) && selected.size >= 3}
											className="h-4 w-4 rounded border-border accent-brand"
										/>
									</td>
									<td className="px-3 py-3 font-medium">
										<Link
											to={`/runs/${run.id}`}
											className="text-foreground hover:text-brand transition-colors"
											onClick={(e) => e.stopPropagation()}
										>
											{run.name}
										</Link>
									</td>
									{columnVisibility.date !== false && (
										<td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
											{formatRelativeTime(run.timestamp)}
										</td>
									)}
									{columnVisibility.items !== false && (
										<td className="px-3 py-3 text-right tabular-nums">{run.totalItems}</td>
									)}
									{columnVisibility.duration !== false && (
										<td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
											{formatDuration(run.durationMs)}
										</td>
									)}
									{evaluatorNames.map((name) =>
										columnVisibility[`score_${name}`] !== false ? (
											<td key={name} className="px-3 py-3 text-right">
												{run.avgScores[name] != null ? (
													<ScoreBadge score={run.avgScores[name]} />
												) : (
													<span className="text-muted-foreground">-</span>
												)}
											</td>
										) : null,
									)}
									{columnVisibility.tags !== false && (
										<td className="px-3 py-3">
											<div className="flex gap-1 flex-wrap">
												{run.tags.map((tag) => (
													<Badge key={tag} color="sand" size="xs">
														{tag}
													</Badge>
												))}
											</div>
										</td>
									)}
									<td className="px-3 py-3">
										<ArrowRight className="h-4 w-4 text-muted-foreground" />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{selected.size >= 2 && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
					<div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
						<span className="text-sm text-muted-foreground">{selected.size} selected</span>
						<Button size="sm" variant="brand" onClick={handleCompare}>
							Compare
						</Button>
						<Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
							Clear
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

function SortableHeader({
	label,
	sortKey,
	currentKey,
	dir,
	onSort,
	className,
}: {
	label: string;
	sortKey: SortKey;
	currentKey: SortKey;
	dir: SortDir;
	onSort: (key: SortKey) => void;
	className?: string;
}) {
	const active = currentKey === sortKey;
	return (
		<th
			className={cn(
				'px-3 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground',
				className,
			)}
			onClick={() => onSort(sortKey)}
			onKeyDown={(e) => e.key === 'Enter' && onSort(sortKey)}
		>
			<span className="inline-flex items-center gap-1">
				{label}
				{active && <span className="text-[10px]">{dir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
			</span>
		</th>
	);
}

function getEvaluatorNames(runs: ResultSummary[]): string[] {
	const names = new Set<string>();
	for (const run of runs) {
		for (const key of Object.keys(run.avgScores)) {
			names.add(key);
		}
	}
	return Array.from(names);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-9 w-56" />
			</div>
			<div className="rounded-xl border bg-card shadow-sm">
				{Array.from({ length: 5 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
					<div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-12" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-5 w-12" />
					</div>
				))}
			</div>
		</div>
	);
}
