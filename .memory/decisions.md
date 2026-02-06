# Technical Decisions

## Monorepo: Turborepo with pnpm

**Decision**: Use Turborepo with pnpm workspaces

**Reasoning**:
- Fast, efficient caching of build artifacts
- Simple pipeline configuration via turbo.json
- Great developer experience for monorepos
- pnpm saves disk space and provides fast installations
- Industry standard for modern monorepo setups

**Alternatives Considered**:
- pnpm workspaces only: Simpler but lacks intelligent caching
- Single package: Too limiting for API/Web/SDK separation

## Full-Stack Framework: Next.js

**Decision**: Single Next.js app for both frontend and backend

**Reasoning**:
- App Router provides excellent DX for both pages and API routes
- Easier deployment (single build, single deploy)
- Shared types between frontend/backend naturally
- Built-in optimizations and SSR/SSG support
- Frontend naturally served by the framework

**Alternatives Considered**:
- Separate Fastify + Vite apps: Better separation but more complex serving setup
- Express + Vite: Most traditional but slower and more verbose

**Architecture Notes**:
- CQRS layers implemented in `/apps/web/src/` (outside app directory)
- API routes in `/apps/web/app/api/` act as thin controllers
- Clear separation maintained through folder structure

## ORM: Prisma

**Decision**: Use Prisma ORM

**Reasoning**:
- Most mature TypeScript ORM with excellent ecosystem
- Schema-first approach with powerful migrations
- Great developer experience with Prisma Studio
- Strong type generation and safety
- Widely adopted with extensive documentation

**Alternatives Considered**:
- Drizzle: TypeScript-first, lighter weight, SQL-like syntax (modern choice)
- Kysely: Maximum control, closest to raw SQL (steeper learning curve)

## Testing: Vitest

**Decision**: Use Vitest for all testing

**Reasoning**:
- Modern, blazing fast with native ESM support
- Jest-compatible API (easy migration if needed)
- Excellent TypeScript support out of the box
- Fast watch mode for development
- Natural fit for Vite-based projects

**Alternatives Considered**:
- Jest: Industry standard, mature, but slower and more config for ESM/TS

## Code Quality: Biome

**Decision**: Use Biome for linting and formatting

**Reasoning**:
- All-in-one tool (linter + formatter)
- Extremely fast (written in Rust)
- Zero config needed with sensible defaults
- Modern choice, rapidly maturing
- Single tool to manage vs. coordinating ESLint + Prettier

**Alternatives Considered**:
- ESLint + Prettier: Traditional, massive ecosystem, highly configurable but slower

## Project Structure

**Decision**: Single Next.js app structure with CQRS layers

**Structure**:
```
/apps/web/
  /app/               # Next.js App Router (pages + API routes)
  /src/               # Backend CQRS layers
    /controllers/
    /commands/
    /queries/
    /services/
    /repositories/
    /lib/
  /tests/             # Unit and integration tests
```

**Reasoning**:
- Maintains CQRS separation while keeping deployment simple
- Clear layer boundaries enforced by folder structure
- Easy to understand and navigate
- Can split into separate apps later if needed
