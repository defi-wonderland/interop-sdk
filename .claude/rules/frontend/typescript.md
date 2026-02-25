---
paths:
    - "**/*.{ts,tsx}"
---

# TypeScript Rules (Frontend)

## Naming Conventions

-   PascalCase for interfaces, types, classes, components
-   camelCase for functions, variables, methods
-   SCREAMING_SNAKE_CASE for constants
-   kebab-case for file names

## Type Safety

-   NO `any` without explicit justification
-   Prefer `unknown` over `any` when type is truly unknown
-   Use explicit return types on exported functions
-   Prefer enums over string literals for better refactoring and explicit intent

## Imports

-   Group imports: external → internal → relative
-   Use named exports over default exports
-   No circular dependencies

## React-Specific Types

-   Use explicit props typing over `React.FC`
-   Event handlers: `React.MouseEvent<HTMLButtonElement>`
