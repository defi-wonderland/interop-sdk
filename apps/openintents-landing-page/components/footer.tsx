import { TentLogo } from "./tent-logo";

const FOOTER_LINKS = [
    {
        title: "Standards",
        links: [
            { label: "ERC-7683", href: "https://eips.ethereum.org/EIPS/eip-7683" },
            { label: "ERC-7930", href: "https://eips.ethereum.org/EIPS/eip-7930" },
            { label: "ERC-7828", href: "https://eips.ethereum.org/EIPS/eip-7828" },
            { label: "EIP-7888", href: "https://eips.ethereum.org/EIPS/eip-7888" },
        ],
    },
    {
        title: "Resources",
        links: [
            { label: "OIF Docs", href: "https://docs.openintents.xyz" },
            { label: "SDK Docs", href: "https://docs.interop.wonderland.xyz" },
            { label: "GitHub", href: "https://github.com/openintentsframework" },
            { label: "Interop SDK", href: "https://github.com/defi-wonderland/interop-sdk" },
        ],
    },
    {
        title: "Ecosystem",
        links: [
            { label: "Interoperable Addresses", href: "https://interopaddress.com" },
            { label: "Ethereum", href: "https://ethereum.org" },
        ],
    },
] as const;

export function Footer() {
    return (
        <footer className="px-6 md:px-12 lg:px-16 pt-16 pb-12 border-t border-border">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 font-mono text-sm mb-12">
                    {FOOTER_LINKS.map((group) => (
                        <div key={group.title}>
                            <h3 className="font-semibold mb-4 text-foreground">{group.title}</h3>
                            <div className="space-y-2 text-muted-foreground">
                                {group.links.map((link) => (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block hover:text-foreground transition-colors"
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-8 border-t border-border">
                    <p className="flex items-center justify-start gap-x-2 font-mono text-xs text-muted-foreground">
                        <TentLogo size={16} />
                        <span>Open Intents</span>
                        <span className="text-border">|</span>
                        <span>Built by</span>
                        <a
                            href="https://wonderland.xyz/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors"
                        >
                            Wonderland
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
}
