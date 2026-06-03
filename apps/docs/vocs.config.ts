import { defineConfig } from "vocs/config";

const docsUrl = "https://docs.interop.wonderland.xyz";

const baseUrl =
    process.env.VERCEL_ENV === "production"
        ? docsUrl
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : docsUrl;

export default defineConfig({
    title: "Interop SDK",
    description:
        "Build multichain applications with interoperable addresses and cross-chain transfer tooling.",
    titleTemplate: "%s · Interop SDK",
    rootDir: ".",
    baseUrl,
    iconUrl: "/eth-diamond-rainbow.svg",
    // Must be a PNG, not the .svg: the OG image renderer (@takumi-rs) can't rasterize
    // eth-diamond-rainbow.svg (percentage-sized root wrapping a base64 PNG via <use>),
    // so a vector logoUrl renders the OG card with no logo. See /api/og.
    logoUrl: "/eth-diamond-rainbow.png",
    accentColor: "light-dark(#3441c0, #7f8cff)",
    socials: [
        {
            icon: "github",
            link: "https://github.com/defi-wonderland/interop-sdk",
        },
    ],
    editLink: {
        link: "https://github.com/defi-wonderland/interop-sdk/edit/main/apps/docs/src/pages/:path",
        text: "Edit on GitHub",
    },
    codeHighlight: {
        themes: {
            light: "github-light",
            dark: "github-dark",
        },
    },
    sidebar: [
        { text: "Overview", link: "/" },
        { text: "Installation", link: "/installation" },
        {
            text: "Addresses",
            link: "/addresses",
            items: [
                { text: "Overview", link: "/addresses" },
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
                { text: "Overview", link: "/cross-chain" },
                { text: "Getting Started", link: "/cross-chain/getting-started" },
                { text: "Concepts", link: "/cross-chain/concepts" },
                { text: "Providers", link: "/cross-chain/providers" },
                { text: "Across Provider", link: "/cross-chain/across-provider" },
                { text: "Relay Provider", link: "/cross-chain/relay-provider" },
                { text: "OIF Provider", link: "/cross-chain/oif-provider" },
                { text: "Bungee Provider", link: "/cross-chain/bungee-provider" },
                { text: "LiFi Intents Provider", link: "/cross-chain/lifi-intents-provider" },
                { text: "Full Example", link: "/cross-chain/example" },
                { text: "Frontend Integration", link: "/cross-chain/frontend-integration" },
                { text: "Order Tracking", link: "/cross-chain/order-tracking" },
                { text: "Advanced Usage", link: "/cross-chain/advanced-usage" },
                { text: "API Reference", link: "/cross-chain/api" },
            ],
        },
    ],
});
