import { defineConfig } from "vocs";

import { ogImages } from "./og.generated";

const docsUrl = "https://docs.interop.wonderland.xyz";

// Per-page OG cards are pre-rendered at build time (scripts/generate-og.mjs).
// Vocs resolves the longest matching path key, so keep keys ordered shortest-first.
const ogImageUrl = Object.fromEntries(
    Object.entries(ogImages)
        .sort(([a], [b]) => a.length - b.length)
        .map(([route, path]): [string, string] => [route, `${docsUrl}${path}`]),
);

export default defineConfig({
    title: "Interop SDK",
    description:
        "Build multichain applications with interoperable addresses and cross-chain transfer tooling.",
    titleTemplate: "%s · Interop SDK",
    rootDir: ".",
    baseUrl: docsUrl,
    iconUrl: "/eth-diamond-rainbow.svg",
    logoUrl: "/eth-diamond-rainbow.svg",
    socials: [
        {
            icon: "github",
            link: "https://github.com/defi-wonderland/interop-sdk",
        },
    ],
    editLink: {
        pattern: "https://github.com/defi-wonderland/interop-sdk/edit/main/apps/docs/pages/:path",
        text: "Edit on GitHub",
    },
    theme: {
        accentColor: "#3441c0",
        variables: {
            color: {
                backgroundAccent: { light: "#3441c0", dark: "#7f8cff" },
                backgroundAccentHover: { light: "#2d35a2", dark: "#a8b1ff" },
                backgroundAccentText: { light: "#ffffff", dark: "#080a20" },
                borderAccent: { light: "#3441c0", dark: "#7f8cff" },
            },
        },
    },
    ogImageUrl,
    llms: {
        generateMarkdown: true,
    },
    markdown: {
        code: {
            themes: {
                light: "github-light",
                dark: "github-dark",
            },
        },
    },
    sidebar: [
        { text: "About", link: "/" },
        { text: "Installation", link: "/installation" },
        {
            text: "Addresses",
            link: "/addresses",
            items: [
                { text: "Getting Started", link: "/addresses/getting-started" },
                { text: "Concepts", link: "/addresses/concepts" },
                { text: "Example", link: "/addresses/example" },
                { text: "Advanced Usage", link: "/addresses/advanced-usage" },
                { text: "API Reference", link: "/addresses/api" },
            ],
        },
        {
            text: "Cross-Chain",
            link: "/cross-chain",
            items: [
                { text: "Getting Started", link: "/cross-chain/getting-started" },
                { text: "Concepts", link: "/cross-chain/concepts" },
                { text: "Flow", link: "/cross-chain/flow" },
                { text: "Providers", link: "/cross-chain/providers" },
                { text: "Across Provider", link: "/cross-chain/across-provider" },
                { text: "Relay Provider", link: "/cross-chain/relay-provider" },
                { text: "OIF Provider", link: "/cross-chain/oif-provider" },
                { text: "Bungee Provider", link: "/cross-chain/bungee-provider" },
                { text: "LiFi Intents Provider", link: "/cross-chain/lifi-intents-provider" },
                { text: "Example", link: "/cross-chain/example" },
                { text: "Frontend Integration", link: "/cross-chain/frontend-integration" },
                { text: "Intent Tracking", link: "/cross-chain/intent-tracking" },
                { text: "Advanced Usage", link: "/cross-chain/advanced-usage" },
                { text: "API Reference", link: "/cross-chain/api" },
            ],
        },
    ],
});
