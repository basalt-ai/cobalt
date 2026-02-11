import { Link, useParams } from 'react-router';
import { getRunDetail } from '../api/runs';
import type { RunDetailResponse } from '../api/types';
import { useApi } from '../hooks/use-api';
import { formatDate, formatDuration, formatScore } from '../lib/utils';

export function RunDetailPage() {
	const { id } = useParams<{ id: string }>();
	const { data, error, loading } = useApi<RunDetailResponse>(() => getRunDetail(id!), [id]);

	if (loading) return <div>Loading run...</div>;
	if (error) return <div>Error: {error.message}</div>;
	if (!data?.run) return <div>Run not found.</div>;

	const { run } = data;

	return (
		<div>
			<p>
				<Link to="/">← Back to runs</Link>
			</p>

			<h1>{run.name}</h1>

			<section>
				<h2>Summary</h2>
				<dl>
					<dt>ID</dt>
					<dd>{run.id}</dd>
					<dt>Date</dt>
					<dd>{formatDate(run.timestamp)}</dd>
					<dt>Items</dt>
					<dd>{run.summary.totalItems}</dd>
					<dt>Duration</dt>
					<dd>{formatDuration(run.summary.totalDurationMs)}</dd>
					<dt>Avg Latency</dt>
					<dd>{formatDuration(run.summary.avgLatencyMs)}</dd>
					{run.summary.totalTokens != null && (
						<>
							<dt>Tokens</dt>
							<dd>{run.summary.totalTokens.toLocaleString()}</dd>
						</>
					)}
					{run.summary.estimatedCost != null && (
						<>
							<dt>Cost</dt>
							<dd>${run.summary.estimatedCost.toFixed(4)}</dd>
						</>
					)}
					{run.tags.length > 0 && (
						<>
							<dt>Tags</dt>
							<dd>{run.tags.join(', ')}</dd>
						</>
					)}
				</dl>
			</section>

			<section>
				<h2>Scores</h2>
				<table>
					<thead>
						<tr>
							<th>Evaluator</th>
							<th>Avg</th>
							<th>Min</th>
							<th>Max</th>
							<th>P50</th>
							<th>P95</th>
						</tr>
					</thead>
					<tbody>
						{Object.entries(run.summary.scores).map(([name, stats]) => (
							<tr key={name}>
								<td>{name}</td>
								<td>{formatScore(stats.avg)}%</td>
								<td>{formatScore(stats.min)}%</td>
								<td>{formatScore(stats.max)}%</td>
								<td>{formatScore(stats.p50)}%</td>
								<td>{formatScore(stats.p95)}%</td>
							</tr>
						))}
					</tbody>
				</table>
			</section>

			{run.ciStatus && (
				<section>
					<h2>CI Status: {run.ciStatus.passed ? 'Passed' : 'Failed'}</h2>
					{run.ciStatus.violations.length > 0 && (
						<ul>
							{run.ciStatus.violations.map((v) => (
								<li key={`${v.evaluator}-${v.metric}`}>{v.message}</li>
							))}
						</ul>
					)}
				</section>
			)}

			<section>
				<h2>Items ({run.items.length})</h2>
				<table>
					<thead>
						<tr>
							<th>#</th>
							<th>Input</th>
							<th>Output</th>
							<th>Latency</th>
							<th>Scores</th>
							{run.items.some((item) => item.error) && <th>Error</th>}
						</tr>
					</thead>
					<tbody>
						{run.items.map((item) => (
							<tr key={item.index}>
								<td>{item.index + 1}</td>
								<td>
									<pre>{JSON.stringify(item.input, null, 2)}</pre>
								</td>
								<td>
									<pre>
										{typeof item.output === 'string'
											? item.output
											: JSON.stringify(item.output, null, 2)}
									</pre>
								</td>
								<td>{formatDuration(item.latencyMs)}</td>
								<td>
									{Object.entries(item.evaluations)
										.map(
											([name, ev]) =>
												`${name}: ${formatScore(ev.score)}%${ev.reason ? ` (${ev.reason})` : ''}`,
										)
										.join('\n')}
								</td>
								{run.items.some((i) => i.error) && <td>{item.error || ''}</td>}
							</tr>
						))}
					</tbody>
				</table>
			</section>
		</div>
	);
}
