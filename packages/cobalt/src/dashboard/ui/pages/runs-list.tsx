import { Link } from 'react-router';
import { getRuns } from '../api/runs';
import type { RunsResponse } from '../api/types';
import { useApi } from '../hooks/use-api';
import { formatDate, formatDuration, formatScore } from '../lib/utils';

export function RunsListPage() {
	const { data, error, loading } = useApi<RunsResponse>(() => getRuns());

	if (loading) return <div>Loading runs...</div>;
	if (error) return <div>Error: {error.message}</div>;
	if (!data?.runs.length) return <div>No experiment runs found.</div>;

	return (
		<div>
			<h1>Experiment Runs</h1>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Date</th>
						<th>Items</th>
						<th>Duration</th>
						<th>Scores</th>
					</tr>
				</thead>
				<tbody>
					{data.runs.map((run) => (
						<tr key={run.id}>
							<td>
								<Link to={`/runs/${run.id}`}>{run.name}</Link>
							</td>
							<td>{formatDate(run.timestamp)}</td>
							<td>{run.totalItems}</td>
							<td>{formatDuration(run.durationMs)}</td>
							<td>
								{Object.entries(run.avgScores)
									.map(([name, score]) => `${name}: ${formatScore(score)}%`)
									.join(', ')}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
