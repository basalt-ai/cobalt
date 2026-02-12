import { defineCommand } from 'citty';
import pc from 'picocolors';
import {
	checkNpmVersion,
	ensureCobaltGitignore,
	generateSkillsFile,
	getPackageVersion,
	integrateWithAITools,
	printAIFilesSuggestion,
} from '../utils/skills.js';

export default defineCommand({
	meta: {
		name: 'update',
		description: 'Update AI skills file and check for SDK updates',
	},
	args: {
		check: {
			type: 'boolean',
			description: 'Check if skills and SDK are up to date (exit code 1 if outdated)',
		},
	},
	async run({ args }) {
		const cwd = process.cwd();
		const version = getPackageVersion();
		let hasOutdated = false;

		if (!args.check) {
			console.log(pc.bold('\n🔷 Cobalt Update\n'));
		}

		try {
			// 1. Ensure .cobalt/.gitignore
			await ensureCobaltGitignore(cwd);

			// 2. Generate/update SKILLS.md
			const skillsUpdated = await generateSkillsFile(cwd);

			if (args.check) {
				if (!skillsUpdated) {
					console.log(pc.green('SKILLS.md is up to date'));
				} else {
					console.log(pc.yellow('SKILLS.md was outdated'));
					hasOutdated = true;
				}
			} else {
				if (skillsUpdated) {
					console.log(pc.green('✓ Updated .cobalt/SKILLS.md'));
				} else {
					console.log(pc.dim('  .cobalt/SKILLS.md is up to date'));
				}
			}

			// 3. Integrate with AI tools (skip in check mode)
			if (!args.check) {
				const updatedFiles = await integrateWithAITools(cwd);
				for (const file of updatedFiles) {
					console.log(pc.green(`✓ Added Cobalt reference to ${file}`));
				}

				if (updatedFiles.length === 0) {
					// Check if any AI files exist at all
					const { existsSync } = await import('node:fs');
					const { resolve } = await import('node:path');
					const hasAnyAIFile = [
						'CLAUDE.md',
						'AGENTS.md',
						'.github/copilot-instructions.md',
						'.cursorrules',
					].some((f) => existsSync(resolve(cwd, f)));

					if (!hasAnyAIFile) {
						printAIFilesSuggestion();
					}
				}
			}

			// 4. Check for SDK updates on npm
			const npmCheck = await checkNpmVersion(version);

			if (args.check) {
				if (npmCheck?.hasUpdate) {
					if (npmCheck.isMajor) {
						console.log(
							pc.yellow(`Major update available: ${npmCheck.current} → ${npmCheck.latest}`),
						);
					} else {
						console.log(pc.yellow(`Update available: ${npmCheck.current} → ${npmCheck.latest}`));
					}
					hasOutdated = true;
				} else if (npmCheck) {
					console.log(pc.green(`Cobalt ${version} is the latest version`));
				}

				if (hasOutdated) {
					process.exit(1);
				}
			} else {
				if (npmCheck?.hasUpdate) {
					console.log('');
					if (npmCheck.isMajor) {
						console.log(
							pc.yellow(`⚠ Major update available: ${npmCheck.current} → ${npmCheck.latest}`),
						);
						console.log(pc.dim('  Major versions may contain breaking changes.'));
						console.log(pc.dim('  Check the changelog before updating.'));
					} else {
						console.log(pc.green(`✓ Update available: ${npmCheck.current} → ${npmCheck.latest}`));
						console.log(pc.dim('  Run: pnpm add @basalt-ai/cobalt@latest'));
						console.log(pc.dim('  Then: npx cobalt update'));
					}
				} else if (npmCheck) {
					console.log(pc.dim(`  Cobalt ${version} is the latest version`));
				}

				console.log(pc.bold(pc.green('\n✅ Update complete!\n')));
			}
		} catch (error) {
			console.error(pc.red('\n❌ Update failed:'), error);
			process.exit(1);
		}
	},
});
