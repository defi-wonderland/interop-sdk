---
paths:
    - "**/errors/**/*.ts"
---

# Error Class Guidelines

## Naming Conventions

-   Use declarative, descriptive names
-   Avoid suffixes like `Exception` or `Error`
-   Example: Use `EmptyArray` instead of `EmptyArrayException`

## Best Practices

-   Extend the base Error class
-   Set appropriate error names
-   Include helpful error messages
-   Consider adding context-specific properties
