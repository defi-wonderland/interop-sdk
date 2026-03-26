---
paths:
    - "**/providers/**/*.ts"
---

# Provider Layer Guidelines

## Architecture

-   Narrowly scoped data/resource handling
-   Single responsibility for data access
-   Implement `IMetadataProvider` interface when applicable

## Naming

-   Consistent naming for metadata interactions (e.g., `GithubProvider`)
-   Names should reflect the resource being provided
-   Use consistent suffixes (`Provider` for providers)
