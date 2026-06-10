---
"@wonderland/interop-cross-chain": minor
---

Validate `RouteQuery` input in `Aggregator.getProvidersForRoute`

`getProvidersForRoute` previously returned `[]` for any malformed query — wrong shape, missing fields, non-hex addresses — which was indistinguishable from "no provider supports this route". Input now goes through a zod schema (`RouteQuerySchema`) so callers get a `ZodError` for bad input and an empty array only when the route really is unsupported. Quote requests have always been validated; route queries now match.
