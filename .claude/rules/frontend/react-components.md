---
paths:
    - "**/*.tsx"
---

# React Component Guidelines

## Component Structure

-   Abstract complex logic from render functions
-   Business logic must live in helper functions or services, never in components
-   Keep render methods simple and declarative
-   Split complex components into smaller ones
-   Use hooks for side effects and state management
-   One component per file
-   Use functional components with hooks
-   Props interface defined above component
-   Export component as named export

## Import Order

1. React imports
2. Third-party libraries
3. Internal files

## Naming

-   PascalCase for components: `UserProfile.tsx`
-   camelCase for hooks: `useAuth.ts`
-   Props interface: `ComponentNameProps`

## Best Practices

-   Use logical AND (`&&`) over ternary conditionals for clarity
-   Keep components focused and reusable
-   Follow React hooks best practices
-   Avoid inline styles
