# CLAUDE.md — Development Guide

> **💡 Collaboration First**: This project values collaborative decision-making. When facing decisions about architecture, developer experience, or anything with significant impact, **always present options and wait for user input** before proceeding. See [Decision-Making Philosophy](#decision-making-philosophy) for details.

## Project Overview

Cobalt is a TypeScript full-stack application built with a CQRS-inspired architecture. It's designed to be scalable, maintainable, and well-tested from the ground up.

### Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Framework**: Next.js 15 (full-stack - frontend + backend)
- **Database**: PostgreSQL 16 (via Docker on port 5433)
- **ORM**: Prisma 6
- **Testing**: Vitest
- **Code Quality**: Biome (linting + formatting)
- **TypeScript**: v5.7 with strict mode enabled

## Architecture

### CQRS Pattern

The backend follows a CQRS-inspired layered architecture:

```
Next.js API Route → Controller → Command/Query → Service → Repository → Prisma → PostgreSQL
```

**Layer Responsibilities:**

- **API Routes** (`/apps/web/app/api/`): Thin HTTP handlers, delegate to controllers
- **Controllers** (`/apps/web/src/controllers/`): Orchestrate commands/queries, handle errors
- **Commands** (`/apps/web/src/commands/`): Write operations - CREATE, UPDATE, DELETE
- **Queries** (`/apps/web/src/queries/`): Read operations - SELECT (never mutate state)
- **Services** (`/apps/web/src/services/`): Business logic, can be shared across commands/queries
- **Repositories** (`/apps/web/src/repositories/`): Data access layer, one per entity/aggregate
- **Prisma**: ORM layer for database communication

### Project Structure

```
cobalt/
├── apps/
│   └── web/                    # Main Next.js application
│       ├── app/                # Next.js App Router (pages + API routes)
│       ├── src/                # Backend CQRS layers
│       │   ├── controllers/
│       │   ├── commands/
│       │   ├── queries/
│       │   ├── services/
│       │   ├── repositories/
│       │   └── lib/            # Utilities (errors, logger, etc.)
│       └── tests/              # Unit and integration tests
├── packages/
│   ├── db/                     # Prisma schema and client
│   ├── types/                  # Shared TypeScript types
│   ├── sdk/                    # SDK for API consumers (future)
│   └── tsconfig/               # Shared TypeScript configs
└── .memory/                    # Project documentation and context
```

## Development Guidelines

### 1. Adding New Features

When adding a new feature, follow this sequence:

1. **Define Types** (`packages/types/`)
   - Add domain types in `src/domain.ts`
   - Add API types in `src/api.ts` with Zod schemas

2. **Database Schema** (`packages/db/`)
   - Update `prisma/schema.prisma`
   - Run `pnpm db:migrate` to create migration
   - Document the schema change in `.memory/analysis.md`

3. **Repository Layer** (`apps/web/src/repositories/`)
   - Create repository class with data access methods
   - Handle database errors, wrap in `DatabaseError`
   - Write unit tests with mocked Prisma client

4. **Service Layer** (`apps/web/src/services/`)
   - Implement business logic
   - Use constructor injection for repositories
   - Write unit tests with mocked repositories

5. **Command/Query Layer** (`apps/web/src/commands/` or `queries/`)
   - Create command for writes or query for reads
   - Orchestrate service calls
   - Write unit tests with mocked services

6. **Controller Layer** (`apps/web/src/controllers/`)
   - Create controller method
   - Delegate to appropriate command/query
   - Keep this layer thin

7. **API Route** (`apps/web/app/api/`)
   - Create Next.js route handler
   - Call controller method
   - Handle errors with proper HTTP status codes
   - Add input validation if needed

8. **Frontend** (`apps/web/app/`)
   - Add pages/components as needed
   - Follow Next.js App Router conventions

9. **Update Documentation**
   - Add API endpoint to `.memory/documentation.md`
   - Update `.memory/progress.md` with what was added
   - Document any architectural decisions in `.memory/decisions.md`

### 2. Writing Tests

**Unit Tests are Mandatory** for all backend layers.

**Test Structure:**
```typescript
describe('FeatureName', () => {
  let service: FeatureService;
  let mockRepository: FeatureRepository;

  beforeEach(() => {
    mockRepository = {
      method: vi.fn(),
    } as unknown as FeatureRepository;

    service = new FeatureService(mockRepository);
  });

  it('should do something', async () => {
    vi.mocked(mockRepository.method).mockResolvedValue(expected);

    const result = await service.someMethod();

    expect(result).toEqual(expected);
    expect(mockRepository.method).toHaveBeenCalledWith(expectedArgs);
  });
});
```

**Run Tests:**
```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

### 3. Database Migrations

**Creating a Migration:**
```bash
# 1. Edit packages/db/prisma/schema.prisma
# 2. Run migration
pnpm --filter @cobalt/db prisma migrate dev --name descriptive_name

# 3. Regenerate Prisma client
pnpm db:generate
```

**Important:**
- Always create migrations with descriptive names
- Never edit generated migration files manually
- Test migrations on a clean database before committing
- Document schema changes in `.memory/analysis.md`

### 4. Code Quality

**Before Committing:**
```bash
pnpm lint              # Check linting
pnpm format            # Format code
pnpm check             # Auto-fix issues
pnpm test              # Run tests
pnpm build             # Verify build works
```

**Code Standards:**
- Use TypeScript strict mode - no `any` types
- Use path aliases (`@/`) for imports within apps/web
- Organize imports (Biome does this automatically)
- Write descriptive variable and function names
- Add comments only when logic isn't self-evident
- Keep functions small and focused

### 5. Git Workflow

**Commit Messages:**

Follow conventional commits:
```
feat: add user registration endpoint
fix: resolve database connection pooling issue
refactor: simplify error handling in repositories
test: add unit tests for UserService
docs: update API documentation
chore: upgrade dependencies
```

**Committing:**
```bash
git add .
git commit -m "type: description"
```

Always include `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>` when Claude contributed significantly.

### 6. Error Handling

Use custom error classes from `apps/web/src/lib/errors.ts`:

```typescript
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors';

// In repositories
throw new DatabaseError('Failed to fetch user');

// In services
throw new NotFoundError('User not found');

// In API routes
catch (error) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.statusCode }
    );
  }
  // Handle unexpected errors
}
```

### 7. Logging

Use the logger from `apps/web/src/lib/logger.ts`:

```typescript
import { logger } from '@/lib/logger';

logger.info('User created', { userId: user.id });
logger.error('Failed to process payment', { error, orderId });
logger.debug('Cache hit', { key });
```

## Memory System

**Always maintain the `.memory/` folder** with up-to-date information:

- **decisions.md**: Document architectural choices and reasoning
- **analysis.md**: Keep codebase structure and entity documentation current
- **progress.md**: Log significant milestones and completed work
- **doubts.md**: Record open questions or concerns
- **roadmap.md**: Update with future plans and next steps
- **documentation.md**: Keep API documentation comprehensive
- **build-issues.md**: Document any build/deployment issues and solutions

**When to Update:**
- After adding new features
- When making architectural decisions
- When encountering and solving problems
- After significant refactoring
- When questions arise that need clarification

## Common Commands

### Development
```bash
pnpm dev                    # Start dev server
pnpm build                  # Build for production
pnpm start                  # Start production server
```

### Database
```bash
docker-compose up -d        # Start PostgreSQL
docker-compose down         # Stop PostgreSQL
pnpm db:migrate            # Run migrations
pnpm db:generate           # Generate Prisma client
pnpm db:studio             # Open Prisma Studio GUI
```

### Testing & Quality
```bash
pnpm test                  # Run all tests
pnpm test:watch            # Run tests in watch mode
pnpm lint                  # Check code quality
pnpm format                # Format code
pnpm check                 # Lint and format
```

### Package Management
```bash
pnpm install               # Install dependencies
pnpm add <pkg>             # Add dependency
pnpm add -D <pkg>          # Add dev dependency
pnpm --filter @cobalt/web add <pkg>  # Add to specific package
```

## Decision-Making Philosophy

**IMPORTANT: When in doubt, ask the user.** This is a collaborative project. The user values being involved in decisions that impact the project's direction, architecture, and developer experience.

### Always Ask About:

#### 🏗️ Architecture & Design
- Adding new architectural patterns or layers
- Changing how layers communicate
- Introducing new dependencies or frameworks
- Modifying the database schema structure
- Changing authentication/authorization approach
- API design decisions (REST conventions, endpoint structure)
- State management strategy changes

#### 🛠️ Developer Experience
- Build tooling changes (bundlers, transpilers)
- Development workflow modifications
- Testing strategy changes
- CI/CD pipeline decisions
- Deployment approach
- Development environment setup changes
- Adding or removing linters/formatters

#### 📦 Dependencies & Infrastructure
- Adding major dependencies (>10MB, framework-level)
- Changing package manager or monorepo tools
- Database migration strategies
- Caching layer additions
- Third-party service integrations
- Infrastructure changes (Docker, hosting)

#### 🎨 User-Facing Impact
- UI/UX patterns and component libraries
- API response format changes
- Error handling strategy for end users
- Performance optimization approaches
- Accessibility implementation decisions

### Decision-Making Process

For **decisions that require approval**:

1. **Identify** that a decision point has been reached
2. **Research** 2-3 viable options (not more, avoid analysis paralysis)
3. **Present** options clearly:
   ```
   I need to make a decision about [X]. Here are the options:

   Option 1: [Name]
   - Pros: ...
   - Cons: ...
   - Context: ...

   Option 2: [Name]
   - Pros: ...
   - Cons: ...
   - Context: ...

   My recommendation: [X] because [reasoning in context of this project]

   What would you prefer?
   ```
4. **Wait for approval** - Don't proceed until you have clear direction
5. **Document** the decision and reasoning in `.memory/decisions.md`
6. **Implement** following the approved approach

### When You Can Proceed Autonomously

You can use your judgment without asking for:
- Following existing established patterns in the codebase
- Writing tests that follow existing test patterns
- Fixing obvious bugs or typos
- Refactoring that doesn't change behavior
- Adding comments or documentation
- Formatting and linting fixes
- Implementing already-decided features following the plan

**Rule of thumb**: If the change could be reasonably debated or affects how developers work with the code, ask first.

## Best Practices

### DO:
✅ **Ask before making impactful decisions** (architecture, DX, dependencies)
✅ Follow the CQRS pattern consistently
✅ Write tests for all backend logic
✅ Use strict TypeScript
✅ Keep layers separated and focused
✅ Document decisions and changes
✅ Use descriptive names
✅ Handle errors explicitly
✅ Keep commits small and focused
✅ Present options with pros/cons when asking
✅ Update `.memory/` after significant changes

### DON'T:
❌ Make architectural decisions without user approval
❌ Skip writing tests
❌ Use `any` type
❌ Mix concerns across layers
❌ Put business logic in API routes
❌ Commit broken code
❌ Make destructive changes without confirmation
❌ Bypass type safety
❌ Leave TODOs without tracking
❌ Assume you know the "best" approach without discussing

## Getting Help

- **README.md**: Setup and getting started guide
- **.memory/**: Project context and decisions
- **Architecture Questions**: Review existing patterns in similar features
- **Stuck?**: Ask the user for clarification or guidance

## Next Steps

See `.memory/roadmap.md` for planned features and future work.
