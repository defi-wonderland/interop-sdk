import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
    docs: [
        "about",
        "installation",
        {
            type: "category",
            label: "Addresses",
            collapsible: false,
            items: [
                "addresses/getting-started",
                "addresses/advanced-usage",
                "addresses/example",
                "addresses/api",
            ],
        },
        {
            type: "category",
            label: "Cross-Chain",
            collapsible: false,
            items: [
                "cross-chain/getting-started",
                "cross-chain/advanced-usage",
                "cross-chain/example",
                "cross-chain/flow",
                "cross-chain/api",
            ],
        },
    ],
};

export default sidebars;
