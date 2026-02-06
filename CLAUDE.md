# CLAUDE.md — Project Bootstrap Instructions

## Context

This is a brand new open-source TypeScript project. The repository is nearly empty — only an `npm init` has been run. You are responsible for bootstrapping the entire project from scratch.

## Your Role

You are the technical architect and lead developer. You will make all architectural and technological decisions, but **you must always ask me before proceeding** by presenting:

- The options you're considering (2-3 max)
- Pros and cons of each, in the context of this project
- Your recommendation and why

Wait for my answer before moving forward. Do this for every major decision including but not limited to:

- Frontend framework (React + Vite? Next.js? Remix? Other?)
- Backend framework (Express? Fastify? Hono? Nest? Or full-stack with Next?)
- ORM (Drizzle? Prisma? TypeORM? Kysely?)
- Test framework (Vitest? Jest?)
- Monorepo strategy (Turborepo? pnpm workspaces? Single package?)
- Any other significant tooling choice

## Architecture Requirements

### Pattern: CQRS-inspired

The backend must follow a CQRS-inspired layered architecture:

```
Controllers → Commands / Queries → Services → Repositories → ORM → PostgreSQL
```

- **Controllers**: Handle HTTP requests, validate input, delegate to commands/queries
- **Commands**: Write operations (create, update, delete) — mutate state
- **Queries**: Read operations — never mutate state
- **Services**: Business logic shared across commands/queries if needed
- **Repositories**: Data access layer, abstracts the ORM. One repository per aggregate/entity
- **ORM**: Handles database communication, migrations, schema definition

### Database

- **PostgreSQL** is the database. No other option.
- The ORM you choose must support migrations. You will create the initial migration.
- Schema should be defined in code (not raw SQL), versioned, and reproducible.

### Frontend

- The frontend must be served as part of the project (not a separate deployment).
- It should have a clean, minimal starting shell (layout, routing, a basic page).
- The exact framework is your call — propose options and let me choose.

### Testing

- **Unit tests are mandatory** on all backend layers: services, commands, queries, repositories.
- **Unit tests on frontend** for any non-trivial logic or components.
- Integration tests are a nice-to-have for later, not required now.
- Choose the test framework and justify your choice.

### Code Quality

- ESLint + Prettier (or Biome — your call, propose it)
- Strict TypeScript (`strict: true`)
- Path aliases for clean imports

## Project Structure

Propose a project structure before writing any code. It should be clean, scalable, and follow the CQRS layering described above. Example of what I'd expect to see (adapt as you see fit):

```
/packages (or /apps, or root — depends on monorepo choice)
  /api
    /src
      /controllers
      /commands
      /queries
      /services
      /repositories
      /entities (or /models, /schema)
      /migrations
      /lib (shared utils, errors, etc.)
    /tests
  /web
    /src
      /components
      /pages (or /routes)
      /lib
    /tests
  /sdk (for later — just create the empty package placeholder)
```

## Deliverable for This First Phase

The goal is a **working shell**. Everything compiles, starts, and tests pass. Specifically:

1. ✅ Project structure created and documented
2. ✅ All dependencies installed
3. ✅ TypeScript configured with strict mode
4. ✅ Backend running with at least one health-check endpoint (`GET /health`)
5. ✅ Database connection working (ORM configured, initial migration created and applied)
6. ✅ Frontend running and served (basic shell: layout + one page)
7. ✅ At least one example of the full CQRS flow wired up end-to-end (e.g., a dummy `GET /api/status` query going through Controller → Query → Service → Repository)
8. ✅ Unit tests passing for that example flow
9. ✅ Linting and formatting configured and passing
10. ✅ `README.md` with setup instructions (dev, test, database)
11. ✅ A `docker-compose.yml` for the PostgreSQL database (dev environment)

## 📁 Memory System (.memory/)

**IMPORTANT:** Throughout the entire process, maintain a `.memory/` folder at the project root containing Markdown files:

```
.memory/
├── README.md              # Index of all memory files
├── decisions.md           # Technical and architectural choices made, with reasoning
├── analysis.md            # Analysis of the existing codebase (entities, pages, routes, etc.)
├── doubts.md              # Open questions, points to clarify with the team
├── progress.md            # Progress journal (what's done, what's left)
├── cleanup-log.md         # Detailed log of what was removed and why
└── build-issues.md        # Build/start issues encountered and how they were resolved
└── roadmap.md        # The roadmap with the instructions for the next steps
└── documentation.md        # Documentation of the app and API (will be usefull after because open source)
```

Add any relevant document that could be useful.

At every significant step:
- Document what you did and why
- Record doubts and questions
- Note alternatives you considered
- This enables reviewing decisions later and maintains a reasoning trail


## What Comes Next (NOT for now, just for context)

After this shell is solid, I will explain the actual product/domain. At that point we'll build:

- The real entities, migrations, and business logic
- A GitHub Action (CI/CD)
- An SDK package (TypeScript, published to npm)

You don't need to build any of that now. Just be aware it's coming so your architecture choices account for it.

## How to Work

1. **Start by proposing the tech stack** — one decision at a time, with pros/cons.
2. **Wait for my approval** on each decision before moving on.
3. **Then propose the project structure** for my review.
4. **Then scaffold everything**, step by step.
5. **Run tests and linting** after each significant step to make sure nothing is broken.
6. **Commit frequently** with clear, conventional commit messages.

Do not rush. Quality over speed. Ask me questions if anything is ambiguous.

Let's go.