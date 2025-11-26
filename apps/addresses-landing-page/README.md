# Interoperable Addresses Landing Page

Landing page for Interoperable Addresses - chain-aware addressing for the Ethereum ecosystem based on ERC-7930 and ERC-7828.

## Overview

This landing page showcases the Interoperable Addresses standard, which solves critical problems in cross-chain interactions:

-   **Chain specificity**: Addresses explicitly include which chain they belong to
-   **Human-readability**: Support for ENS names alongside hexadecimal addresses
-   **Error prevention**: Built-in checksum validation to detect potential errors
-   **Universal compatibility**: Works with any chain type, EVM or non-EVM
-   **On-chain registry**: Chain identifiers stored on-chain without centralized dependencies

## Standards

-   **[ERC-7930](https://eips.ethereum.org/EIPS/eip-7930)**: Establishes the base binary format for interoperable addresses
-   **[ERC-7828](https://eips.ethereum.org/EIPS/eip-7828)**: Extends with human-readable names using ENS and an on-chain chain registry

## Getting Started

This Next.js app is part of the pnpm workspace. Install dependencies from the **monorepo root**:

```bash
# From the repository root
pnpm install
```

Run the development server:

```bash
# From the repository root
pnpm --filter addresses-landing-page dev

# Or navigate to the app directory
cd apps/addresses-landing-page
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the landing page.

## Technology Stack

-   **Framework**: Next.js 16 with App Router
-   **Styling**: Tailwind CSS 4.x
-   **UI Components**: Radix UI primitives
-   **Fonts**: Geist Sans & Geist Mono
-   **Effects**: Paper Design shaders for background animations
-   **Analytics**: Vercel Analytics

## Project Structure

```
addresses-landing-page/
├── app/
│   ├── layout.tsx      # Root layout with metadata
│   ├── page.tsx        # Main landing page
│   └── globals.css     # Global styles
├── components/
│   ├── hero-section.tsx
│   ├── problems-section.tsx
│   ├── how-it-works-section.tsx
│   ├── specs-section.tsx
│   ├── sdk-section.tsx
│   ├── demo-section.tsx
│   ├── faq-section.tsx
│   └── ui/            # Reusable UI components
└── public/
    └── interop-addresses-diagram.svg
```

## Learn More

-   [ERC-7930 Specification](https://eips.ethereum.org/EIPS/eip-7930)
-   [ERC-7828 Specification](https://eips.ethereum.org/EIPS/eip-7828)
-   [Interop SDK Documentation](https://github.com/defi-wonderland/interop-sdk)
-   [Live Demo](https://interop.wonderland.xyz /)

## License

MIT
