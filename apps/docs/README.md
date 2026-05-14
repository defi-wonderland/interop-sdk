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

Output lands in `apps/docs/build/`.

## Project Structure

-   `pages/` — MDX content (URL path mirrors file path; e.g. `pages/addresses/concepts.mdx` → `/addresses/concepts`)
-   `public/` — static assets served at the site root
-   `vocs.config.ts` — site config (title, sidebar, social links, edit link)

## Adding a Page

1. Create `pages/<path>/<slug>.mdx` (mirror the desired URL).
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

Deployed to Vercel on every push to `dev` (preview) and `main` (production) via the standard Vercel GitHub integration. The build script writes to `apps/docs/build/`, which is what the Vercel project's output-directory setting points at.
