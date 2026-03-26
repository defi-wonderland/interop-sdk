import { ExternalLink } from "lucide-react";

import { Section } from "./section";

interface SolutionItem {
    name: string;
    description: string;
    url?: string;
}

interface SolutionGroup {
    category: string;
    items: SolutionItem[];
}

const SOLUTION_GROUPS: SolutionGroup[] = [
    {
        category: "Standards",
        items: [
            {
                name: "ERC-7683",
                description:
                    "An interface for cross-chain intent representation (Redux under development)",
                url: "https://ethereum-magicians.org/t/erc-7683-redux-programmable-fillers/27674",
            },
            {
                name: "ERC-7930",
                description:
                    "Standardising onchain binary representation of chain-specific addresses",
                url: "https://eips.ethereum.org/EIPS/eip-7930",
            },
            {
                name: "ERC-7828",
                description:
                    "Standardising a human-readable format for chain-specific addresses (e.g. vitalik.eth@arbitrum)",
                url: "https://eips.ethereum.org/EIPS/eip-7828",
            },
            {
                name: "EIP-7888",
                description: "Trustless storage-based message broadcasting for rollups",
                url: "https://eips.ethereum.org/EIPS/eip-7888",
            },
        ],
    },
    {
        category: "Infrastructure",
        items: [
            {
                name: "Broadcaster",
                description: "Trustless storage-based message broadcasting for rollups",
                url: "https://github.com/openintentsframework/broadcaster",
            },
            {
                name: "on.eth Chain Registry",
                description: "A canonical, ENS-native registry for chains and their metadata",
                url: "https://ens.domains/blog/post/on-eth-chain-registry",
            },
            {
                name: "The Compact",
                description:
                    "An ownerless ERC6909 contract that facilitates the voluntary formation and mediation of reusable resource locks",
                url: "https://github.com/Uniswap/the-compact",
            },
        ],
    },
    {
        category: "Framework (OIF)",
        items: [
            {
                name: "oif-contracts",
                description: "Modular locking, oracles and settlement",
                url: "https://github.com/openintentsframework/oif-contracts",
            },
            {
                name: "oif-solver",
                description: "Cross-chain solver implementation for the Open Intents Framework",
                url: "https://github.com/openintentsframework/oif-solver",
            },
            {
                name: "oif-specs",
                description: "Standardised interfaces for getting quotes and submitting orders",
                url: "https://github.com/openintentsframework/oif-specs",
            },
        ],
    },
    {
        category: "SDK (interop-sdk)",
        items: [
            {
                name: "addresses",
                description: "Easily interact with chain-specific addresses",
                url: "https://docs.interop.wonderland.xyz/addresses",
            },
            {
                name: "cross-chain",
                description: "Access the OIF and other interoperability providers",
                url: "https://docs.interop.wonderland.xyz/cross-chain",
            },
        ],
    },
];

export function SolutionsSection() {
    return (
        <Section id="solutions" title="Solutions">
            <p className="text-muted-foreground mb-8 leading-relaxed">
                The Open Intents initiative develops open standards, contracts, tooling and
                documentation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                {SOLUTION_GROUPS.map((group) => (
                    <div key={group.category}>
                        <h3 className="font-mono text-sm uppercase tracking-widest text-accent mb-4">
                            {group.category}
                        </h3>
                        <div className="space-y-4">
                            {group.items.map((item) => (
                                <div key={item.name} className="group">
                                    {item.url ? (
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block rounded-lg border border-border bg-card p-4 hover:border-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-sm font-medium">
                                                    {item.name}
                                                </span>
                                                <ExternalLink
                                                    className="size-3 text-muted-foreground group-hover:text-accent transition-colors"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {item.description}
                                            </p>
                                        </a>
                                    ) : (
                                        <div className="rounded-lg border border-border bg-card p-4">
                                            <span className="font-mono text-sm font-medium block mb-1">
                                                {item.name}
                                            </span>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-sm text-muted-foreground mt-8 italic">
                We are constantly working to add more open standards and tools to improve the
                usability of interop on Ethereum.
            </p>
        </Section>
    );
}
