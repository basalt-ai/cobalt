# API and Application Documentation

## API Endpoints

### Health Check

**GET** `/api/health`

Simple health check endpoint to verify the API is running.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-05T12:00:00.000Z"
}
```

**Status Codes**:
- `200 OK` - Service is healthy

---

### System Status

**GET** `/api/status`

Retrieves the current system status. This endpoint demonstrates the full CQRS architecture flow.

**Response**:
```json
{
  "status": "operational",
  "message": "System initialized",
  "timestamp": "2026-02-05T12:00:00.000Z"
}
```

**Status Codes**:
- `200 OK` - Status retrieved successfully
- `500 Internal Server Error` - Database or server error

**Error Response**:
```json
{
  "error": "DATABASE_ERROR",
  "message": "Failed to fetch system status",
  "statusCode": 500
}
```

**Architecture Flow**:
1. API Route Handler (`/app/api/status/route.ts`)
2. StatusController (`/src/controllers/StatusController.ts`)
3. GetStatusQuery (`/src/queries/GetStatusQuery.ts`)
4. StatusService (`/src/services/StatusService.ts`)
5. StatusRepository (`/src/repositories/StatusRepository.ts`)
6. Prisma Client → PostgreSQL

**Business Logic**:
- If no status exists in the database, creates a default "operational" status
- Returns the most recently created status record

---

## Frontend Pages

### Home Page

**URL**: `/`

Landing page with links to API endpoints for easy testing.

**Features**:
- Project title and description
- Links to health check and status endpoints
- Opens endpoints in new tab for easy inspection

---

## Database Schema

### SystemStatus Table

**Table Name**: `system_status`

Stores system status records for the example CQRS flow.

**Columns**:
- `id` (String, Primary Key) - CUID identifier
- `status` (String, default: "operational") - Current system status
- `message` (String, nullable) - Optional status message
- `createdAt` (DateTime) - Record creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Indexes**:
- Primary key on `id`
- Implicitly ordered by `createdAt` for latest status retrieval

---

## Development Workflow

### Starting Development

1. Start PostgreSQL:
   ```bash
   docker-compose up -d
   ```

2. Set up environment:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Run migrations:
   ```bash
   pnpm db:migrate
   ```

5. Start development server:
   ```bash
   pnpm dev
   ```

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

### Code Quality

```bash
# Check formatting and linting
pnpm lint

# Format code
pnpm format

# Check and fix
pnpm check
```

### Database Operations

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

### Building for Production

```bash
# Build all packages
pnpm build

# Start production server (after build)
cd apps/web && pnpm start
```

---

## Architecture Documentation

### CQRS Pattern

The application follows a CQRS-inspired (Command Query Responsibility Segregation) architecture:

**Commands** (Write Operations):
- Mutate state
- Located in `/apps/web/src/commands/`
- *Currently empty, placeholder for future write operations*

**Queries** (Read Operations):
- Never mutate state
- Located in `/apps/web/src/queries/`
- Example: `GetStatusQuery`

**Services**:
- Contain business logic
- Can be shared across commands and queries
- Example: `StatusService`

**Repositories**:
- Abstract database operations
- One repository per aggregate/entity
- Example: `StatusRepository`

**Benefits**:
- Clear separation of concerns
- Easier to test (each layer isolated)
- Scalable architecture
- Maintainable and understandable codebase

### Package Structure

**@cobalt/web** - Main Next.js application
- Frontend pages and components
- API routes (thin layer)
- Backend business logic (CQRS layers)
- Tests

**@cobalt/db** - Database package
- Prisma schema and client
- Migrations
- Database singleton export

**@cobalt/types** - Shared types
- API request/response types
- Domain models
- Zod validation schemas

**@cobalt/sdk** - SDK placeholder
- Future TypeScript SDK for API consumers
- To be published to npm

**@cobalt/tsconfig** - TypeScript configs
- Shared base configuration
- Next.js-specific config
- Node.js package config
