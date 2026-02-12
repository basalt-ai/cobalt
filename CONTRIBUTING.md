# Contributing to Cobalt

Thank you for your interest in contributing to Cobalt! We welcome contributions from the community and appreciate your help in making this project better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Submitting Changes](#submitting-changes)
- [PR Review Process](#pr-review-process)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors. We expect:

- Respectful communication
- Constructive feedback
- Collaboration over competition
- Focus on what's best for the project and community

## Ways to Contribute

There are many ways to contribute to Cobalt:

### 🐛 Report Bugs
Found a bug? [Open an issue](https://github.com/basalt-ai/cobalt/issues) with:
- Clear description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- Your environment (Node.js version, OS, etc.)

### ✨ Suggest Features
Have an idea? [Open an issue](https://github.com/basalt-ai/cobalt/issues) with:
- Clear description of the feature
- Use cases and motivation
- Examples of how it would work

### 📝 Improve Documentation
Documentation improvements are always welcome:
- Fix typos or unclear explanations
- Add examples or tutorials
- Improve API documentation
- Update guides and best practices

### 🔌 Create Plugins
Extend Cobalt with custom evaluators:
- Write plugins for new evaluator types
- Integrate with other AI evaluation frameworks
- Share your plugins with the community

### 💻 Submit Code
Fix bugs, add features, or improve existing code:
- Start with issues labeled `good first issue`
- Follow the development workflow below
- Write tests for your changes
- Update documentation as needed

## Getting Started

### Prerequisites

- **Node.js**: 20.0.0 or higher
- **pnpm**: 8.0.0 or higher
- **Git**: For version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
```bash
git clone https://github.com/YOUR-USERNAME/cobalt.git
cd cobalt
```

3. Add upstream remote:
```bash
git remote add upstream https://github.com/basalt-ai/cobalt.git
```

## Development Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Set up environment variables:**
```bash
# Create .env file for testing (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

3. **Run tests to verify setup:**
```bash
pnpm test
```

4. **Build the project:**
```bash
pnpm build
```

## Development Workflow

### 1. Create a Feature Branch

**Always create a new branch for your changes:**

```bash
git checkout -b category/short-description
```

**Branch naming convention:**
- `feat/` - New features (e.g., `feat/similarity-evaluator`)
- `fix/` - Bug fixes (e.g., `fix/csv-parsing-bug`)
- `docs/` - Documentation (e.g., `docs/api-updates`)
- `test/` - Tests (e.g., `test/evaluator-coverage`)
- `refactor/` - Code refactoring (e.g., `refactor/simplify-dispatch`)
- `chore/` - Maintenance (e.g., `chore/upgrade-deps`)

### 2. Make Your Changes

- Write clear, focused commits
- Follow existing code patterns
- Add tests for new functionality
- Update documentation as needed

### 3. Run Quality Checks

**Before committing, ensure all checks pass:**

```bash
# Run tests
pnpm test

# Check linting
pnpm lint

# Verify build
pnpm build
```

**Optional but recommended:**
```bash
# Auto-format code
pnpm format

# Run all checks
pnpm check
```

### 4. Commit Your Changes

**Use conventional commit messages (keep them short):**

```bash
git add .
git commit -m "feat: add similarity evaluator"
```

**Good commit messages:**
- `feat: add similarity evaluator`
- `fix: CSV parsing bug`
- `docs: update README badges`
- `test: add evaluator tests`

**Bad commit messages (too long):**
- `feat: add similarity evaluator with embeddings support and comprehensive tests`
- `fix: resolve the dataset CSV parsing bug that was causing issues with commas`

### 5. Rebase on Main

**Before pushing, rebase on the latest main:**

```bash
git fetch upstream
git rebase upstream/main
```

If conflicts occur:
```bash
# Resolve conflicts in your editor
git add .
git rebase --continue
```

### 6. Push and Create PR

```bash
# Push to your fork
git push -u origin your-branch-name

# Create PR using GitHub CLI (optional)
gh pr create --title "Short PR title" --body "Description" --base main
```

## Code Standards

### TypeScript Guidelines

- ✅ Use **strict mode** - no `any` types
- ✅ Write **descriptive names** for variables and functions
- ✅ Keep functions **small and focused**
- ✅ Handle **errors explicitly**
- ✅ Use **functional patterns** where appropriate
- ❌ Avoid complex nested logic
- ❌ Don't skip type definitions

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check code style
pnpm lint

# Auto-format
pnpm format

# Auto-fix issues
pnpm check
```

### Architecture Patterns

- **Evaluators**: Return `{score: 0, reason: "error"}` instead of throwing
- **Dataset methods**: Chainable and immutable
- **CLI commands**: Simple and composable
- **Error handling**: Graceful with meaningful messages

## Testing Requirements

### Test Coverage

**All core functionality must have tests:**

- ✅ Core API functions (`experiment`, `Evaluator`, `Dataset`)
- ✅ Evaluator implementations
- ✅ Dataset transformations
- ✅ Utility functions (cost, stats, template)
- ✅ Error handling and edge cases

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('FeatureName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should do something', async () => {
    // Arrange
    const input = 'test'

    // Act
    const result = await functionUnderTest(input)

    // Assert
    expect(result).toBe('expected')
  })
})
```

### Mocking Guidelines

- **LLM APIs**: Always mock `openai` and `@anthropic-ai/sdk`
- **File system**: Mock `node:fs` or use test helpers
- **External services**: Never make real API calls in tests

### Run Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
```

## Submitting Changes

### Pull Request Process

1. **Create PR** with clear title and description
2. **Link related issues** (e.g., "Fixes #123")
3. **Describe your changes**:
   - What was changed and why
   - How to test the changes
   - Any breaking changes
   - Screenshots (if UI-related)

### PR Checklist

Before submitting, ensure:

- [ ] Tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] Branch is rebased on latest `main`
- [ ] No merge conflicts

### PR Template

```markdown
## Description
Brief description of what this PR does

## Motivation
Why is this change needed?

## Changes
- List of changes made
- Each change on a new line

## Testing
How to test these changes

## Breaking Changes
Any breaking changes? (yes/no)
If yes, describe migration path

## Screenshots (if applicable)
Add screenshots for UI changes
```

## PR Review Process

### What to Expect

1. **Automated checks** run on your PR (tests, linting, build)
2. **Maintainer review** within 1-3 business days
3. **Feedback and iteration** if changes are requested
4. **Approval and merge** once all checks pass

### Review Criteria

Reviewers will check:
- Code quality and style
- Test coverage
- Documentation completeness
- Performance implications
- Breaking changes
- Security considerations

### After Review

If changes are requested:

1. **Make the requested changes**
2. **Run quality checks** (`pnpm test && pnpm lint`)
3. **Commit and push** to update the PR
4. **Respond to feedback** with comments

## Project Structure

Understanding the codebase:

```
packages/cobalt/
├── src/
│   ├── core/           # Core experiment runner
│   ├── datasets/       # Dataset loading
│   ├── evaluators/     # Evaluator implementations
│   ├── cli/            # CLI commands
│   ├── storage/        # Data persistence
│   ├── utils/          # Utilities
│   └── types/          # TypeScript types
├── tests/              # Test suite
├── docs/               # Documentation
└── examples/           # Example projects
```

## Development Resources

- **[CLAUDE.md](CLAUDE.md)** - Comprehensive development guide
- **[README.md](README.md)** - User-facing documentation
- **[.memory/](.memory/)** - Project context and decisions
- **[docs/](docs/)** - Additional documentation

## Community

### Get Help

- 💬 **Discord**: [Join our community](https://discord.gg/yW2RyZKY) _(coming soon)_
- 🐛 **Issues**: [GitHub Issues](https://github.com/basalt-ai/cobalt/issues)
- 📖 **Docs**: [Documentation](.memory/)

### Stay Updated

- ⭐ **Star the repo** to follow development
- 👀 **Watch releases** for new versions
- 📢 **Follow discussions** for announcements

## License

By contributing to Cobalt, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to Cobalt! 🎉 Your help makes this project better for everyone.
