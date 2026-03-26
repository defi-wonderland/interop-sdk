---
paths:
    - "**/*.tsx"
---

# React Performance Guidelines

## Optimization

-   Implement proper memoization (useMemo, useCallback)
-   Optimize re-renders with React.memo when profiling shows benefit
-   Lazy load components when appropriate
-   Optimize images to be under 250kB
-   Avoid inline object/array creation in JSX

## State Management

-   Use appropriate state management solutions
-   Avoid unnecessary state
-   Keep state as local as possible
-   Use context API appropriately
-   Derive values from existing state when possible

## Hooks Performance

### useEffect

-   Prefer derived values over state + effect patterns
-   Use `useMemo` for expensive calculations, not `useEffect`
-   Always include cleanup functions for subscriptions/timers

### useCallback

-   Use for event handlers passed to memoized children
-   Don't wrap every function - only when necessary
-   Include all dependencies in the dependency array
