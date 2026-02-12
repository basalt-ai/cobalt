# Installation

Install and configure Cobalt in your project.

## Prerequisites

Before installing Cobalt, ensure you have:

- **Node.js** 18 or higher
- **pnpm**, **npm**, or **yarn** package manager
- **TypeScript** 5.0+ (recommended)

Verify your Node version:

```bash
node --version
# Should show v18.0.0 or higher
```

## Installation Methods

### New Project (Recommended)

The fastest way to get started is using `cobalt init`:

```bash
# Create a new directory
mkdir my-ai-tests
cd my-ai-tests

# Initialize with Cobalt
npx cobalt init
```

This command:
1. Installs Cobalt as a dependency
2. Creates project structure:
   ```
   my-ai-tests/
   ├── experiments/          # Your test files go here
   │   └── example.cobalt.ts # Sample experiment
   ├── cobalt.config.ts      # Configuration
   ├── .cobalt/              # Local storage (gitignored)
   │   ├── results/          # Test results
   │   ├── cache/            # LLM response cache
   │   └── history.db        # Run history
   ├── package.json
   └── tsconfig.json
   ```
3. Adds necessary scripts to `package.json`
4. Creates a sample experiment file

### Existing Project

Add Cobalt to an existing TypeScript project:

**Using pnpm (recommended):**
```bash
pnpm add @basalt-ai/cobalt
```

**Using npm:**
```bash
npm install @basalt-ai/cobalt
```

**Using yarn:**
```bash
yarn add cobalt
```

Then initialize the folder structure:

```bash
npx cobalt init
```

### Global Installation (Optional)

Install Cobalt globally for system-wide access:

```bash
npm install -g cobalt
# or
pnpm add -g cobalt
```

This lets you run `cobalt` commands without `npx`:

```bash
cobalt run
cobalt history
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
# OpenAI API key (required for LLM evaluators)
OPENAI_API_KEY=sk-...

# Anthropic API key (optional, for Claude evaluators)
ANTHROPIC_API_KEY=sk-ant-...

# Cobalt configuration (optional)
COBALT_CACHE_TTL=24h        # Cache TTL (default: 24 hours)
COBALT_CONCURRENCY=5        # Max concurrent executions (default: 5)
```

Load environment variables:

```bash
# Manually
export OPENAI_API_KEY="sk-..."

# Or use dotenv
pnpm add dotenv
```

In your experiments:
```typescript
import 'dotenv/config'
```

### TypeScript Configuration

Cobalt requires ES modules. Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["experiments/**/*", "cobalt.config.ts"]
}
```

Update `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "test": "cobalt run"
  }
}
```

### Cobalt Configuration File

The `cobalt.config.ts` file allows you to set default options:

```typescript
import { defineConfig } from '@basalt-ai/cobalt'

export default defineConfig({
  // Default test directory
  testDir: 'experiments',

  // Default evaluators for all experiments
  evaluators: [],

  // Judge configuration (for LLM evaluators)
  judge: {
    model: 'gpt-5-mini',
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY
  },

  // Cache configuration
  cache: {
    enabled: true,
    ttl: '24h'
  },

  // Default concurrency
  concurrency: 5,

  // Quality thresholds (use --ci flag to enable exit codes)
  thresholds: {},

  // Default tags
  tags: [],

  // Plugin paths
  plugins: []
})
```

## Verification

Verify your installation:

```bash
# Check version
npx cobalt --version

# Run example experiment
npx cobalt run --file experiments/example.cobalt.ts

# View command help
npx cobalt --help
```

You should see:

```
Cobalt
Unit testing for AI Agents
```

## Next Steps

### 1. Set Up Your API Keys

```bash
export OPENAI_API_KEY="sk-..."
```

### 2. Run Your First Experiment

```bash
npx cobalt run --file experiments/example.cobalt.ts
```

### 3. Explore the Results

```bash
# View history
npx cobalt history

# Inspect detailed results
# Result JSON files are saved in .cobalt/data/results/
```

### 4. Learn More

- [Quickstart Guide](quickstart.md) — 5-minute tutorial
- [Your First Experiment](first-experiment.md) — Detailed walkthrough
- [Configuration Reference](../configuration.md) — All config options

## Troubleshooting

### "Module not found: cobalt"

**Problem**: Package not installed

**Solution**:
```bash
pnpm add @basalt-ai/cobalt
# or
npm install @basalt-ai/cobalt
```

### "SyntaxError: Cannot use import statement"

**Problem**: Not using ES modules

**Solution**: Add to `package.json`:
```json
{
  "type": "module"
}
```

### "OPENAI_API_KEY not found"

**Problem**: API key not set

**Solution**:
```bash
export OPENAI_API_KEY="sk-..."
# or create .env file
```

### "TypeScript errors"

**Problem**: Incorrect TypeScript configuration

**Solution**: Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### Permission Denied

**Problem**: Missing execute permissions

**Solution**:
```bash
chmod +x node_modules/.bin/cobalt
# or use npx
npx cobalt run
```

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 18.0.0 | 20.0.0+ |
| RAM | 512 MB | 2 GB+ |
| Disk | 100 MB | 1 GB+ (for results/cache) |
| OS | macOS, Linux, Windows | - |

## IDE Setup

### VS Code

Install recommended extensions:
- **TypeScript** (built-in)
- **ESLint** for linting
- **Prettier** for formatting

Add to `.vscode/settings.json`:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true
}
```

### WebStorm / IntelliJ

- Enable TypeScript support in Preferences → Languages & Frameworks → TypeScript
- Set Node.js interpreter: Preferences → Languages & Frameworks → Node.js

## Updating Cobalt

Check for updates:

```bash
pnpm outdated cobalt
```

Update to latest version:

```bash
pnpm update cobalt
# or
npm update cobalt
```

Upgrade to specific version:

```bash
pnpm add @basalt-ai/cobalt@latest
# or
pnpm add @basalt-ai/cobalt@0.2.0
```

## Uninstalling

Remove Cobalt from your project:

```bash
pnpm remove cobalt
# or
npm uninstall cobalt
```

Clean up Cobalt files:

```bash
rm -rf .cobalt/
rm -rf experiments/
rm cobalt.config.ts
```

---

**Next:** [Quickstart](quickstart.md) — Run your first experiment in 5 minutes
