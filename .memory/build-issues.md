# Build and Startup Issues

## Known Issues and Solutions

### Issue Log
This file will track any build, startup, or runtime issues encountered during development and their solutions.

## Preventive Measures Taken

1. **Prisma Client Generation**: Added `db:generate` script and pre-build step to ensure Prisma client is generated before building.

2. **Module Resolution**: Configured Next.js to transpile workspace packages (`@cobalt/db`, `@cobalt/types`) to prevent module resolution issues.

3. **TypeScript Strict Mode**: Enabled strict mode from the start to catch type errors early.

4. **Path Aliases**: Set up consistent path aliases (`@/*`) to avoid relative import issues.

5. **Environment Variables**: Created `.env.example` template to document required environment variables.

6. **Database Connection Pooling**: Implemented Prisma client singleton pattern to prevent connection exhaustion during hot reload.

## Environment Setup Checklist

Before running the app, ensure:
- [ ] PostgreSQL is running (via Docker Compose)
- [ ] `.env.local` file created from `.env.example`
- [ ] `DATABASE_URL` is correctly set
- [ ] Dependencies are installed (`pnpm install`)
- [ ] Prisma client is generated (`pnpm db:generate`)
- [ ] Migrations are applied (`pnpm db:migrate`)

## Common Issues and Solutions

*This section will be populated as issues are encountered and resolved.*
