import { defineConfig } from "vocs";

export default defineConfig({
    title: "Interop SDK",
    description: "Build cross-chain applications with standardized addressing",
    titleTemplate: "%s · Interop SDK",
    rootDir: ".",
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
    },
    ogImageUrl: {
        "/": "https://vocs.dev/api/og?title=%title&description=%description",
    },
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
