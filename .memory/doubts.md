# Open Questions and Doubts

## None Currently

All major architectural decisions have been made and implemented. This file will be updated as questions arise during future development.

## Future Considerations

1. **Dependency Injection Container**: As the app grows, consider adding a DI container (TSyringe, InversifyJS) instead of manual constructor injection.

2. **Integration Tests**: Once the app has real features, add integration tests that test the full stack with a test database.

3. **API Versioning**: When the API stabilizes, consider versioning strategy (e.g., `/api/v1/`).

4. **Authentication**: Will need to decide on auth strategy when user management is added (JWT, sessions, OAuth, etc.).

5. **Validation Library**: Zod is included for types, but may want to add runtime validation middleware for API endpoints.

6. **Error Monitoring**: Consider adding Sentry or similar for production error tracking.

7. **Rate Limiting**: Will need rate limiting for public APIs.

8. **Caching Strategy**: Consider Redis or similar for caching frequently accessed data.
