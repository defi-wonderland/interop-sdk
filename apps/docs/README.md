# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

This Docusaurus app is part of the pnpm workspace. Install dependencies from the **monorepo root**:

```bash
# From the repository root
pnpm install
```

## Local Development

```bash
# From the repository root
pnpm --filter docs start

# Or navigate to the docs directory
cd apps/docs
pnpm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
# From the repository root
pnpm --filter docs build

# Or from the docs directory
cd apps/docs
pnpm build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Deployment is handled automatically via GitHub Actions (`.github/workflows/deploy.yml`) when pushing to main or dev branches. The workflow deploys directly to Vercel.
