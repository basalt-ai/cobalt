import { defineCommand } from 'citty';
import pc from 'picocolors';
import { loadResult } from '../../storage/results.js';

export default defineCommand({
	meta: {
		name: 'compare',
		description: 'Compare two experiment runs',
	},
	args: {
		baseline: {
			type: 'positional',
			description: 'Baseline run ID',
			required: true,
		},
		candidate: {
			type: 'positional',
			description: 'Candidate run ID',
			required: true,
		},
	},
	async run({ args }) {
		try {
			const baseline = args.baseline as string;
			const candidate = args.candidate as string;

			console.log(pc.bold('\n🔷 Comparing Runs\n'));

			// Load both runs
			console.log(pc.dim('Loading runs...'));
			const runA = await loadResult(baseline);
			const runB = await loadResult(candidate);

			console.log(pc.green(`✓ Baseline: ${runA.name} (${runA.id})`));
			console.log(pc.green(`✓ Candidate: ${runB.name} (${runB.id})`));
			console.log('');

			// Compare scores
			console.log(pc.bold('Score Comparison:\n'));

			for (const evaluator in runA.summary.scores) {
				const baselineScore = runA.summary.scores[evaluator].avg;
				const candidateScore = runB.summary.scores[evaluator]?.avg || 0;

				const diff = candidateScore - baselineScore;
				const percentChange = baselineScore !== 0 ? (diff / baselineScore) * 100 : 0;

				const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
				const color = diff > 0 ? pc.green : diff < 0 ? pc.red : pc.dim;

				console.log(
					`  ${evaluator}: ${baselineScore.toFixed(2)} → ${candidateScore.toFixed(2)} ${color(
						`${arrow} ${diff > 0 ? '+' : ''}${diff.toFixed(3)} (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%)`,
					)}`,
				);
			}

			console.log('');

			// Summary
			const improvements = Object.keys(runA.summary.scores).filter((evaluator) => {
				const diff =
					(runB.summary.scores[evaluator]?.avg || 0) - runA.summary.scores[evaluator].avg;
				return diff > 0;
			});

			const regressions = Object.keys(runA.summary.scores).filter((evaluator) => {
				const diff =
					(runB.summary.scores[evaluator]?.avg || 0) - runA.summary.scores[evaluator].avg;
				return diff < 0;
			});

			if (improvements.length > 0) {
				console.log(
					pc.green(`✓ ${improvements.length} improvement(s): ${improvements.join(', ')}`),
				);
			}

			if (regressions.length > 0) {
				console.log(pc.red(`✗ ${regressions.length} regression(s): ${regressions.join(', ')}`));
			}

			if (improvements.length === 0 && regressions.length === 0) {
				console.log(pc.dim('No significant changes detected'));
			}

			console.log('');
		} catch (error) {
			console.error(pc.red('\n❌ Failed to compare runs:'), error);
			console.log(pc.dim('Usage: npx cobalt compare <baseline-id> <candidate-id>\n'));
			process.exit(1);
		}
	},
});
