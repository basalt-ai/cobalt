# Skills

Cobalt auto-generates a skills file (`.cobalt/SKILLS.md`) that teaches AI coding assistants how to use Cobalt in your project.

## How It Works

When you run `cobalt init` (or `cobalt update`), Cobalt:

1. Generates `.cobalt/SKILLS.md` from a built-in template
2. Scans for AI instruction files in your project
3. Appends a reference to the skills file if one is found

The skills file is versioned and automatically updated when Cobalt is upgraded.

## Supported AI Assistants

Cobalt integrates with these AI instruction files:

| File | AI Tool |
|------|---------|
| `CLAUDE.md` | Claude Code |
| `AGENTS.md` | Cursor, Copilot, Aider, Windsurf |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.cursorrules` | Cursor (legacy) |

When one of these files exists, Cobalt appends:

```markdown
# Cobalt
See .cobalt/SKILLS.md for the Cobalt AI testing framework guide.
```

If no AI instruction file is detected, Cobalt prints a suggestion to create one.

## Version Tracking

The skills file includes a version comment:

```markdown
<!-- cobalt-skills-version: 0.1.0 -->
```

On subsequent runs of `cobalt init` or `cobalt update`, the file is only regenerated if the version has changed, avoiding unnecessary overwrites. Run `cobalt update` after upgrading the SDK to refresh the skills file and check for new versions.

## What the Skills File Contains

The generated `.cobalt/SKILLS.md` teaches AI assistants:

- How to run experiments (`cobalt run`)
- How to write experiment files (`.cobalt.ts`)
- Available evaluator types and their configuration
- Dataset loading methods
- How to interpret results
- Common workflows (add tests, fix regressions, etc.)

## Manual Setup

If you prefer manual integration, add this line to your AI instruction file:

```markdown
See .cobalt/SKILLS.md for the Cobalt AI testing framework guide.
```

Then generate the skills file:

```bash
npx cobalt init
```
