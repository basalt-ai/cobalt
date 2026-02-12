import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';

const SKILLS_VERSION_REGEX = /<!-- cobalt-skills-version: (.+?) -->/;
const COBALT_REFERENCE =
	'\n# Cobalt\nSee .cobalt/SKILLS.md for the Cobalt AI testing framework guide.\n';

const AI_INSTRUCTION_FILES = [
	{ file: 'CLAUDE.md', tool: 'Claude Code' },
	{ file: 'AGENTS.md', tool: 'Cursor, Copilot, Aider, Windsurf' },
	{ file: '.github/copilot-instructions.md', tool: 'GitHub Copilot' },
	{ file: '.cursorrules', tool: 'Cursor (legacy)' },
];

/**
 * Get the current package version
 */
export function getPackageVersion(): string {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	// From dist/ → package root
	const packageJsonPath = resolve(__dirname, '..', 'package.json');
	try {
		const pkg = JSON.parse(require('node:fs').readFileSync(packageJsonPath, 'utf-8'));
		return pkg.version;
	} catch {
		return '0.2.0';
	}
}

/**
 * Resolve the template path from the installed package
 */
function getTemplatePath(): string {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	// From dist/ → ../templates/COBALT.md.template
	return resolve(__dirname, '..', 'templates', 'COBALT.md.template');
}

/**
 * Extract the skills version from a SKILLS.md content string
 */
export function extractSkillsVersion(content: string): string | null {
	const match = content.match(SKILLS_VERSION_REGEX);
	return match ? (match[1] ?? null) : null;
}

/**
 * Generate the .cobalt/SKILLS.md file
 * @returns true if file was written, false if already up-to-date
 */
export async function generateSkillsFile(cwd: string): Promise<boolean> {
	const version = getPackageVersion();
	const skillsPath = resolve(cwd, '.cobalt', 'SKILLS.md');

	// Check if already up-to-date
	if (existsSync(skillsPath)) {
		const existing = await readFile(skillsPath, 'utf-8');
		const existingVersion = extractSkillsVersion(existing);
		if (existingVersion === version) {
			return false;
		}
	}

	// Read template
	const templatePath = getTemplatePath();
	if (!existsSync(templatePath)) {
		console.warn(pc.yellow('Skills template not found, skipping SKILLS.md generation'));
		return false;
	}

	const template = await readFile(templatePath, 'utf-8');
	const content = template.replace(/\{\{VERSION\}\}/g, version);

	// Ensure .cobalt/ directory exists
	const cobaltDir = resolve(cwd, '.cobalt');
	if (!existsSync(cobaltDir)) {
		await mkdir(cobaltDir, { recursive: true });
	}

	await writeFile(skillsPath, content, 'utf-8');
	return true;
}

/**
 * Create .cobalt/.gitignore if it doesn't exist
 */
export async function ensureCobaltGitignore(cwd: string): Promise<boolean> {
	const gitignorePath = resolve(cwd, '.cobalt', '.gitignore');

	if (existsSync(gitignorePath)) {
		const content = await readFile(gitignorePath, 'utf-8');
		if (content.includes('data/')) {
			return false;
		}
		await appendFile(gitignorePath, '\ndata/\n');
		return true;
	}

	// Ensure .cobalt/ directory exists
	const cobaltDir = resolve(cwd, '.cobalt');
	if (!existsSync(cobaltDir)) {
		await mkdir(cobaltDir, { recursive: true });
	}

	await writeFile(gitignorePath, 'data/\n', 'utf-8');
	return true;
}

/**
 * Scan for AI instruction files and append Cobalt reference
 * @returns list of files that were updated
 */
export async function integrateWithAITools(cwd: string): Promise<string[]> {
	const updated: string[] = [];

	for (const { file } of AI_INSTRUCTION_FILES) {
		const filePath = resolve(cwd, file);

		if (!existsSync(filePath)) continue;

		const content = await readFile(filePath, 'utf-8');

		// Skip if reference already exists
		if (content.includes('.cobalt/SKILLS.md')) continue;

		await appendFile(filePath, COBALT_REFERENCE);
		updated.push(file);
	}

	return updated;
}

/**
 * Print suggestion when no AI instruction files are found
 */
export function printAIFilesSuggestion(): void {
	console.log(pc.dim(''));
	console.log(pc.dim('  No AI instruction file detected. To help your AI assistant use Cobalt,'));
	console.log(pc.dim('  create one of these files and add: See .cobalt/SKILLS.md'));
	console.log(pc.dim(''));
	console.log(pc.dim('    AGENTS.md                          (Cursor, Copilot, Aider, Windsurf)'));
	console.log(pc.dim('    CLAUDE.md                          (Claude Code)'));
	console.log(pc.dim('    .github/copilot-instructions.md    (GitHub Copilot)'));
}

/**
 * Check npm registry for newer version of Cobalt
 * @returns { latest, current, hasUpdate, isMajor } or null on failure
 */
export async function checkNpmVersion(currentVersion: string): Promise<{
	latest: string;
	current: string;
	hasUpdate: boolean;
	isMajor: boolean;
} | null> {
	try {
		const response = await fetch('https://registry.npmjs.org/@basalt-ai/cobalt');
		if (!response.ok) return null;

		const data = (await response.json()) as Record<string, unknown>;
		const distTags = data['dist-tags'] as Record<string, string> | undefined;
		const latest = distTags?.latest;
		if (!latest) return null;

		const [currentMajor] = currentVersion.split('.');
		const [latestMajor] = latest.split('.');

		return {
			latest,
			current: currentVersion,
			hasUpdate: latest !== currentVersion,
			isMajor: latestMajor !== currentMajor,
		};
	} catch {
		return null;
	}
}
