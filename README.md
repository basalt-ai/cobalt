# Cobalt

A TypeScript full-stack application built with Next.js, featuring a CQRS-inspired architecture and PostgreSQL database.

## Features

- **Full-Stack TypeScript** - End-to-end type safety from database to frontend
- **CQRS Architecture** - Clean separation of commands and queries
- **Monorepo Setup** - Turborepo with pnpm workspaces for efficient builds
- **Modern Testing** - Vitest for fast, modern unit testing
- **Database Migrations** - Prisma ORM with PostgreSQL
- **Code Quality** - Biome for lightning-fast linting and formatting
- **Developer Experience** - Hot reload, strict TypeScript, path aliases

## Prerequisites

- **Node.js** 20.0.0 or higher
- **pnpm** 8.0.0 or higher
- **Docker** and **Docker Compose** (for PostgreSQL)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` if you need to change database credentials.

### 3. Start PostgreSQL

```bash
docker-compose up -d
```

### 4. Run Database Migrations

```bash
pnpm db:migrate
```

When prompted for a migration name, press Enter to accept the default.

### 5. Start Development Server

```bash
pnpm dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **Status Endpoint**: http://localhost:3000/api/status

## Project Structure

```
cobalt/
├── apps/
│   └── web/                    # Main Next.js application
│       ├── app/                # Next.js App Router
│       │   ├── api/            # API routes (thin controllers)
│       │   ├── layout.tsx      # Root layout
│       │   └── page.tsx        # Homepage
│       ├── src/                # Backend CQRS layers
│       │   ├── controllers/    # Request handlers
│       │   ├── commands/       # Write operations (future)
│       │   ├── queries/        # Read operations
│       │   ├── services/       # Business logic
│       │   ├── repositories/   # Data access layer
│       │   └── lib/            # Utilities (errors, logger)
│       └── tests/              # Unit and integration tests
├── packages/
│   ├── db/                     # Prisma database package
│   │   └── prisma/
│   │       └── schema.prisma   # Database schema
│   ├── types/                  # Shared TypeScript types
│   ├── sdk/                    # SDK placeholder (future)
│   └── tsconfig/               # Shared TS configs
├── .memory/                    # Project documentation
├── docker-compose.yml          # PostgreSQL setup
└── turbo.json                  # Turborepo config
```

## Architecture

### CQRS Flow

```
API Route → Controller → Query/Command → Service → Repository → Prisma → PostgreSQL
```

**Example Flow** (GET `/api/status`):
1. **API Route** ([apps/web/app/api/status/route.ts](apps/web/app/api/status/route.ts)) - Handles HTTP request
2. **Controller** ([apps/web/src/controllers/StatusController.ts](apps/web/src/controllers/StatusController.ts)) - Delegates to query
3. **Query** ([apps/web/src/queries/GetStatusQuery.ts](apps/web/src/queries/GetStatusQuery.ts)) - Orchestrates operation
4. **Service** ([apps/web/src/services/StatusService.ts](apps/web/src/services/StatusService.ts)) - Business logic
5. **Repository** ([apps/web/src/repositories/StatusRepository.ts](apps/web/src/repositories/StatusRepository.ts)) - Data access
6. **Prisma** - ORM layer to PostgreSQL

### Layer Responsibilities

- **Controllers**: Thin layer that delegates to commands/queries
- **Commands**: Write operations (create, update, delete) - mutate state
- **Queries**: Read operations - never mutate state
- **Services**: Reusable business logic shared across operations
- **Repositories**: Abstract database operations, one per entity/aggregate

## Development Commands

### Development

```bash
# Start dev server (Next.js)
pnpm dev

# Build all packages
pnpm build
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Code Quality

```bash
# Check linting and formatting
pnpm lint

# Format code
pnpm format

# Check and auto-fix issues
pnpm check
```

### Database

```bash
# Generate Prisma client (after schema changes)
pnpm db:generate

# Create and apply migrations
pnpm db:migrate

# Open Prisma Studio (database GUI)
pnpm db:studio

# Stop PostgreSQL
docker-compose down

# Reset database (WARNING: deletes all data)
docker-compose down -v
```

## API Endpoints

### GET `/api/health`

Health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-05T12:00:00.000Z"
}
```

### GET `/api/status`

System status endpoint (demonstrates full CQRS flow).

**Response**:
```json
{
  "status": "operational",
  "message": "System initialized",
  "timestamp": "2026-02-05T12:00:00.000Z"
}
```

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) - Full-stack React framework
- **Database**: [PostgreSQL 16](https://www.postgresql.org/) - Relational database
- **ORM**: [Prisma 5](https://www.prisma.io/) - Type-safe database toolkit
- **Testing**: [Vitest 2](https://vitest.dev/) - Fast unit test framework
- **Code Quality**: [Biome](https://biomejs.dev/) - Fast linter and formatter
- **Monorepo**: [Turborepo](https://turbo.build/) - High-performance build system
- **Package Manager**: [pnpm](https://pnpm.io/) - Fast, disk-efficient package manager
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) - Strict mode enabled

## Testing

Unit tests cover all CQRS layers:
- ✅ Repositories (data access logic)
- ✅ Services (business logic)
- ✅ Queries (orchestration)

Run tests with:
```bash
pnpm test
```

Tests use Vitest with mocked Prisma client for fast, isolated testing.

## Memory System

The [.memory/](.memory/) folder contains project documentation:
- **decisions.md** - Technical decisions and reasoning
- **analysis.md** - Codebase structure analysis
- **progress.md** - Development progress journal
- **roadmap.md** - Future plans and enhancements
- **documentation.md** - Detailed API documentation

## What's Next?

This is a working shell with example code. The next steps are:

1. **Define Your Domain** - Replace the example `SystemStatus` with your actual entities
2. **Add Features** - Implement real business logic using the CQRS pattern
3. **Authentication** - Add user management and auth
4. **CI/CD** - Set up GitHub Actions for automated testing and deployment
5. **SDK Development** - Build the TypeScript SDK in `/packages/sdk`

See [.memory/roadmap.md](.memory/roadmap.md) for detailed next steps.

## License

ISC

## Contributing

This is currently a bootstrapped project. Contribution guidelines will be added as the project matures.
