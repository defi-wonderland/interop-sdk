# openintents.xyz revamp

We need to revamp openintents.xyz (take a look at it as a reference, it redirects to a Notion page). Let's create a new page with an improved positioning which is less "OIF-centric" and more "Open Intents". Potential content is below.

Approach:

-   this is a new app in /apps
-   Similar stack to addresses-landing-page (for consistency)
-   Let's build off some of the tent-based imagery (In-tents?) - I have pasted the logo header as oif-header.png at the root, and check out https://docs.openintents.xyz/docs's favicon

## Draft content

## Goal

The Open Intents initiative is an ecosystem-wide initiative focused on improving the cross-chain user experience on Ethereum while maintaining freedom and minimising trust.

### Principles

-   Accessibility: making interoperability accessible and usable for chains, developers and users
-   Choice: ensuring that developers and end-users have freedom and flexibility, combating lock-in and walled gardens
-   Trust-minimisation: providing solutions that reduce dependence on centralised actors

## Solutions

The Open Intents initiative develops open standards, contracts, tooling and documentation.

-   ERC-7683: an interface for cross-chain intent representation
    -   v2 is under development
-   ERC-7930: standardising onchain binary representation of chain-specific addresses
-   ERC-7828: standardising a human-readable format for chain-specific addresses (e.g. alice.eth@arbitrum)
-   Broadcaster: trustless storage-based message broadcasting for rollups.
-   The Compact: an ownerless ERC6909 contract that facilitates the voluntary formation and mediation of reusable resource locks
-   OIF: full-stack framework for cross-chain intents to be permissionlessly deployed, discovered, and solved
    -   oif-contracts: modular locking, oracles and settlement
    -   oif-solver: cross-chain solver implementation for the Open Intents Framework (OIF)
    -   oif-specs: standardised interfaces for getting quotes and submitting orders
-   interop-sdk: an open toolkit for app and wallet developers
    -   addresses: easily interact with chain-specific addresses
    -   cross-chain: access the OIF and other interoperability providers

> We are constantly working to add more open standards and tools to improve the usability of interop on Ethereum

## Open Intents for you

-   For chains: deploy OIF contracts, The Compact, and Broadcaster, run OIF solvers to connect
-   For infrastructure providers: integrate the OIF, add support for cross-chain addresses, leverage trust-minimised settlement solutions
-   For interoperability protocols: integrate onchain and API standards, get supported in the interop-sdk
-   For wallets and applications: integrate the interop-sdk to add cross-chain and interoperable addresses to your application

> Get involved!

## Contributors

-   Existing logos from openintents.xyz

---

# Implementation Plan

## App: `apps/openintents-landing-page`

### File Structure

```
apps/openintents-landing-page/
├── app/
│   ├── favicon.ico
│   ├── globals.css          # OKLCH theme (dark-first, purple accent)
│   ├── layout.tsx           # Root layout (Geist fonts, metadata, Analytics)
│   └── page.tsx             # Composes all sections
├── components/
│   ├── ui/
│   │   └── button.tsx       # shadcn button
│   ├── section.tsx          # Reusable section wrapper
│   ├── navbar.tsx           # Sticky nav (scroll-triggered)
│   ├── hero-section.tsx     # Logo + mission statement
│   ├── principles-section.tsx  # 3 principle cards
│   ├── solutions-section.tsx   # Standards/Infra/Framework/SDK
│   ├── audience-section.tsx    # "Open Intents for you" CTA cards
│   ├── contributors-section.tsx # Logo grid
│   ├── cta-section.tsx      # "Get involved!" CTA
│   └── footer.tsx           # Links + attribution
├── lib/
│   └── utils.ts             # cn() utility
├── public/
│   ├── logos/               # Contributor SVGs (reused from addresses-landing-page)
│   └── og-image.png
├── .eslintrc.cjs
├── .gitignore
├── components.json          # shadcn config
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

### Stack (matching addresses-landing-page)

-   Next.js 16 + React 19 + TypeScript
-   Tailwind CSS 4.1 via `@tailwindcss/postcss`
-   shadcn/ui (new-york style) + Radix UI + Lucide icons
-   Geist Sans + Geist Mono fonts (monospace-first)
-   next-themes (default to dark)
-   Vercel Analytics
-   `cn()` from clsx + tailwind-merge

Not needed (trimmed from reference): mermaid, @paper-design/shaders-react, recharts, form libraries.

### Design Decisions

-   **Logo**: Recreate just the tent graphic (no text) from oif-header.png as an SVG (rectangles preserving the pixel-art/retro aesthetic). Scalable and themeable. The "Open Intents" text will be rendered as a regular heading, not part of the logo.
-   **Contributor logos**: Use logos from the current openintents.xyz (31 teams): Across, Arbitrum, Biconomy, BootNode, Caldera, Eco, Epoch Protocol, Espresso, Everclear, Fuel Network, Gelato, Gnosis, Hashi, Hyperlane, Khalani, LI.FI, Linea, Namechain, Nomial, OpenZeppelin, Optimism, Polygon, Polymer, Scroll, Soneium, Starknet, Succinct, Superbridge, T1, Taiko, Unichain, Wonderland. We'll need to source SVG logos for each.
-   **Hero style**: Clean and minimal - dark background with tent logo SVG + heading + mission text. No canvas/WebGL effects.

### Styling

-   **Dark-first** theme with purple accent (inspired by oif-header.png)
-   OKLCH color variables: dark background with purple tint, lavender accent (~`oklch(0.65 0.12 290)`)
-   Full-width sections (no 40/60 split like addresses-landing-page)
-   Content constrained to `max-w-6xl mx-auto`
-   Mobile-first responsive grids

### Component → Content Mapping

| Component              | Content                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero-section`         | Tent logo + "Open Intents" heading + mission statement                                                                                          |
| `principles-section`   | 3 cards: Accessibility, Choice, Trust-minimisation                                                                                              |
| `solutions-section`    | Grouped: Standards (ERC-7683/7930/7828), Infra (Broadcaster, The Compact), Framework (OIF contracts/solver/specs), SDK (addresses, cross-chain) |
| `audience-section`     | 4 CTA cards: chains, infra providers, interop protocols, wallets/apps                                                                           |
| `contributors-section` | Logo grid (reuse pattern from `logos-section.tsx`)                                                                                              |
| `cta-section`          | "Get involved!" with buttons to GitHub/Discord + docs                                                                                           |
| `footer`               | Link columns: Standards, Resources, Community                                                                                                   |

### Implementation Phases

**Phase 1: Scaffold**

1. Create `package.json` with dependencies
2. Add to `pnpm-workspace.yaml`
3. Copy/adapt config files: `tsconfig.json`, `postcss.config.mjs`, `next.config.ts`, `.eslintrc.cjs`, `components.json`, `.gitignore`
4. Create `lib/utils.ts` (cn utility)

**Phase 2: Theme & Layout** 5. Create `app/globals.css` with dark-first OKLCH purple theme 6. Create `app/layout.tsx` (fonts, metadata, ThemeProvider defaulting to dark) 7. Create `app/page.tsx` composing all sections

**Phase 3: Shared Components** 8. Create `components/section.tsx` (adapted for full-width centered layout) 9. Create `components/ui/button.tsx` (shadcn button) 10. Add favicon and tent logo SVG assets to `public/`

**Phase 4: Page Sections (top to bottom)** 11. `hero-section.tsx` - hero with tent logo, heading, mission 12. `navbar.tsx` - sticky nav with scroll detection 13. `principles-section.tsx` - 3-column card grid with Lucide icons 14. `solutions-section.tsx` - grouped list of standards/tools with links 15. `audience-section.tsx` - 4 CTA cards 16. `contributors-section.tsx` - logo grid (adapt from reference logos-section) 17. `cta-section.tsx` + `footer.tsx`

**Phase 5: Polish** 18. Add contributor logos to `public/logos/` 19. Test all breakpoints, keyboard nav, and heading hierarchy 20. Run `pnpm dev` and verify the build works

### Verification

1. `pnpm install` succeeds
2. `pnpm --filter openintents-landing-page dev` starts without errors
3. Page renders correctly at localhost with all sections visible
4. Dark mode is default, light mode toggle works
5. Responsive: mobile (single column), tablet, desktop layouts all work
6. Keyboard navigation through all interactive elements
7. `pnpm --filter openintents-landing-page build` succeeds
