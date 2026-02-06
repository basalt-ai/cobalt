# Codebase Analysis

## Project Structure

### Monorepo Layout
```
/cobalt/
├── apps/
│   └── web/                    # Main Next.js application
├── packages/
│   ├── db/                     # Prisma database package
│   ├── types/                  # Shared TypeScript types
│   ├── sdk/                    # SDK placeholder
│   └── tsconfig/               # Shared TS configurations
├── .memory/                    # Project documentation
├── docker-compose.yml          # PostgreSQL dev environment
├── turbo.json                  # Turborepo configuration
└── pnpm-workspace.yaml         # Workspace definition
```

### Backend Architecture (CQRS)

**Layer Flow**:
```
API Route → Controller → Query/Command → Service → Repository → Prisma → PostgreSQL
```

**Current Implementation**:
1. **API Routes** (`/apps/web/app/api/`)
   - `health/route.ts` - Simple health check endpoint
   - `status/route.ts` - Full CQRS example endpoint

2. **Controllers** (`/apps/web/src/controllers/`)
   - `StatusController.ts` - Delegates to queries/commands

3. **Queries** (`/apps/web/src/queries/`)
   - `GetStatusQuery.ts` - Read operation for system status

4. **Services** (`/apps/web/src/services/`)
   - `StatusService.ts` - Business logic (creates default if none exists)

5. **Repositories** (`/apps/web/src/repositories/`)
   - `StatusRepository.ts` - Data access layer for system status

6. **Utilities** (`/apps/web/src/lib/`)
   - `errors.ts` - Custom error classes (AppError, NotFoundError, etc.)
   - `logger.ts` - Simple logging utility

### Database Schema

**Models** (from `/packages/db/prisma/schema.prisma`):
- `SystemStatus` - Example model for CQRS demonstration
  - id (String, cuid)
  - status (String, default: "operational")
  - message (String, optional)
  - createdAt (DateTime)
  - updatedAt (DateTime)

### Shared Packages

**@cobalt/db**:
- Exports Prisma client singleton
- Contains schema and migrations
- Prevents connection exhaustion in development

**@cobalt/types**:
- API types (HealthResponse, StatusResponse, ErrorResponse)
- Domain types (SystemStatus interface)
- Zod schemas for validation

**@cobalt/sdk**:
- Placeholder for future SDK development
- Currently exports only version constant

**@cobalt/tsconfig**:
- base.json - Strict TypeScript base configuration
- nextjs.json - Next.js-specific TypeScript config
- node.json - Node.js package configuration

### Frontend

**Pages**:
- `/` (page.tsx) - Homepage with links to API endpoints

**Layout**:
- Root layout with metadata and global styles

**Styling**:
- globals.css - CSS reset and basic component styles
- CSS variables for theming

### Testing

**Structure**:
- `/apps/web/tests/unit/` - Unit tests for all CQRS layers
- `/apps/web/tests/integration/` - Placeholder for integration tests
- `setup.ts` - Global test setup with Prisma mocks

**Coverage**:
- StatusRepository: Data access logic and error handling
- StatusService: Business logic and default creation
- GetStatusQuery: Query orchestration and response format

**Strategy**:
- Vitest with mocked dependencies
- Each layer tested in isolation
- Mock Prisma client for database operations

## Key Patterns

### Dependency Injection
Simple constructor injection used throughout:
```typescript
const repository = new StatusRepository();
const service = new StatusService(repository);
```

### Error Handling
- Custom error classes extend AppError
- Errors mapped to HTTP status codes in API routes
- DatabaseError for data layer failures

### Logging
- Simple console-based logger
- Different levels: info, warn, error, debug
- Debug only in development mode
