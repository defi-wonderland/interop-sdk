# Interop SDK Docs

This site is built with [Vocs](https://vocs.dev/).

## Installation

This app is part of the pnpm workspace. Install dependencies from the **monorepo root**:

```bash
pnpm install
```

## Local Development

```bash
# From the repository root
pnpm --filter docs start

# Or from this directory
cd apps/docs
pnpm start
```

## Build

```bash
pnpm --filter docs build
```

On Vercel, output lands in `.vercel/output/` (Vercel Build Output API — static assets plus serverless functions for `/api/og` and friends). Locally, output lands in `apps/docs/dist/`.

## Project Structure

-   `src/pages/` — MDX content (URL path mirrors file path; e.g. `src/pages/addresses/concepts.mdx` → `/addresses/concepts`)
-   `src/components/` — React components imported from MDX
-   `public/` — static assets served at the site root
-   `vocs.config.ts` — site config (title, sidebar, social links, edit link)

## Adding a Page

1. Create `src/pages/<path>/<slug>.mdx` (mirror the desired URL).
2. Add frontmatter:
    ```yaml
    ---
    title: Page Title
    description: A 150-character description for search and social cards.
    ---
    ```
3. Add an entry under the appropriate section in `vocs.config.ts`'s `sidebar` array.
4. `pnpm start` to preview.

## Deployment

Deployed to Vercel on every push to `dev` (preview) and `main` (production) via the standard Vercel GitHub integration. Vocs 2 emits the Vercel Build Output API layout to `apps/docs/.vercel/output/`, which Vercel ingests automatically. Static pages are served from the CDN; `/api/*` endpoints (e.g. `/api/og` for dynamic Open Graph images) run as serverless functions.
