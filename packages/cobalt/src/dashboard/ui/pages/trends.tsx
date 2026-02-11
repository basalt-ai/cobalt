import { ArrowLeft } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from 'recharts';
import { getRuns } from '../api/runs';
import { getTrends } from '../api/trends';
import type { RunsResponse, TrendsResponse } from '../api/types';
import { ScoreBadge } from '../components/data/score-badge';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { useApi } from '../hooks/use-api';
import { formatRelativeTime } from '../lib/utils';

const LINE_COLORS = [
	'#db5704',
	'#3358d4',
	'#30a46c',
	'#e5484d',
	'#cf3897',
	'#f5a623',
	'#6e56cf',
	'#00a2c7',
];

export function TrendsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const experiment = searchParams.get('experiment') ?? '';
	const navigate = useNavigate();

	// Fetch all runs to get unique experiment names
	const { data: runsData } = useApi<RunsResponse>(() => getRuns());

	const experimentNames = useMemo(() => {
		if (!runsData?.runs) return [];
		const names = new Set<string>();
		for (const run of runsData.runs) {
			names.add(run.name);
		}
		return Array.from(names).sort();
	}, [runsData]);

	// Auto-select first experiment if none selected
	const activeExperiment = experiment || experimentNames[0] || '';

	const {
		data: trendsData,
		error,
		loading,
	} = useApi<TrendsResponse>(() => {
		if (!activeExperiment) return Promise.reject(new Error('No experiment selected'));
		return getTrends(activeExperiment);
	}, [activeExperiment]);

	function handleExperimentChange(name: string) {
		setSearchParams({ experiment: name });
	}

	if (!runsData && !experiment) {
		return <LoadingSkeleton />;
	}

	// Get all evaluator names from trend data
	const evaluatorNames = useMemo(() => {
		if (!trendsData?.trends?.length) return [];
		const names = new Set<string>();
		for (const point of trendsData.trends) {
			for (const key of Object.keys(point.scores)) {
				names.add(key);
			}
		}
		return Array.from(names);
	}, [trendsData]);

	// Prepare chart data
	const chartData = useMemo(() => {
		if (!trendsData?.trends?.length) return [];
		return trendsData.trends.map((point) => ({
			id: point.id,
			date: new Date(point.timestamp).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
			}),
			timestamp: point.timestamp,
			...point.scores,
		}));
	}, [trendsData]);

	return (
		<div className="space-y-6">
			<PageHeader title="Trends" description="Score evolution over time">
				{experimentNames.length > 0 && (
					<Select value={activeExperiment} onValueChange={handleExperimentChange}>
						<SelectTrigger className="w-56">
							<SelectValue placeholder="Select experiment" />
						</SelectTrigger>
						<SelectContent>
							{experimentNames.map((name) => (
								<SelectItem key={name} value={name}>
									{name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</PageHeader>

			{!activeExperiment ? (
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<p className="text-lg font-medium">No experiments found</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Run experiments to see trends over time
					</p>
				</div>
			) : loading ? (
				<LoadingSkeleton />
			) : error ? (
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<p className="text-sm text-destructive">Failed to load trends: {error.message}</p>
					<Button
						variant="outline"
						size="sm"
						className="mt-4"
						onClick={() => window.location.reload()}
					>
						Retry
					</Button>
				</div>
			) : !chartData.length ? (
				<div className="flex flex-col items-center justify-center py-20 text-center">
					<p className="text-lg font-medium">No trend data</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Run the experiment multiple times to see trends
					</p>
				</div>
			) : (
				<>
					{/* Chart */}
					<div className="rounded-xl border bg-card shadow-sm p-6">
						<ResponsiveContainer width="100%" height={320}>
							<LineChart data={chartData}>
								<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
								<XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
								<YAxis
									domain={[0, 1]}
									tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
									tickFormatter={(v: number) => v.toFixed(1)}
								/>
								<RechartsTooltip
									contentStyle={{
										backgroundColor: 'var(--card)',
										border: '1px solid var(--border)',
										borderRadius: '8px',
										fontSize: '12px',
									}}
									formatter={(value: number) => [value.toFixed(3), undefined]}
								/>
								<Legend />
								{evaluatorNames.map((name, i) => (
									<Line
										key={name}
										type="monotone"
										dataKey={name}
										stroke={LINE_COLORS[i % LINE_COLORS.length]}
										strokeWidth={2}
										dot={{ r: 4 }}
										activeDot={{ r: 6 }}
									/>
								))}
							</LineChart>
						</ResponsiveContainer>
					</div>

					{/* Runs Table */}
					<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
						<div className="border-b bg-muted/50 px-4 py-3">
							<h2 className="text-sm font-semibold">Runs ({chartData.length})</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b">
										<th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
											Date
										</th>
										{evaluatorNames.map((name) => (
											<th
												key={name}
												className="px-4 py-2.5 text-right font-medium text-muted-foreground"
											>
												{name}
											</th>
										))}
										<th className="px-4 py-2.5 w-10" />
									</tr>
								</thead>
								<tbody>
									{chartData.map((point) => (
										<tr
											key={point.id}
											className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
											onClick={() => navigate(`/runs/${point.id}`)}
											onKeyDown={(e) => e.key === 'Enter' && navigate(`/runs/${point.id}`)}
										>
											<td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
												{formatRelativeTime(point.timestamp)}
											</td>
											{evaluatorNames.map((name) => {
												const score = point[name] as number | undefined;
												return (
													<td key={name} className="px-4 py-2.5 text-right">
														{score != null ? (
															<ScoreBadge score={score} />
														) : (
															<span className="text-muted-foreground">-</span>
														)}
													</td>
												);
											})}
											<td className="px-4 py-2.5">
												<Link
													to={`/runs/${point.id}`}
													className="text-xs text-brand hover:underline"
													onClick={(e) => e.stopPropagation()}
												>
													View
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

function LoadingSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-32" />
				<Skeleton className="h-9 w-56" />
			</div>
			<Skeleton className="h-80 rounded-xl" />
			<Skeleton className="h-48 rounded-xl" />
		</div>
	);
}
