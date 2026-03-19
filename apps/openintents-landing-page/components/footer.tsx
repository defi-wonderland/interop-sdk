import { TentLogo } from "./tent-logo";

export function Footer() {
    return (
        <footer className="px-6 md:px-12 lg:px-16 pt-16 pb-12 border-t border-border">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 font-mono text-sm mb-12">
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Standards</h3>
                        <div className="space-y-2 text-muted-foreground">
                            <a
                                href="https://eips.ethereum.org/EIPS/eip-7683"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:text-foreground transition-colors"
                            >
                                ERC-7683
                            </a>
                            <a
                                href="https://eips.ethereum.org/EIPS/eip-7930"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:text-foreground transition-colors"
                            >
                                ERC-7930
                            </a>
                            <a
                                href="https://eips.ethereum.org/EIPS/eip-7828"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:text-foreground transition-colors"
                            >
                                ERC-7828
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Resources</h3>
                        <div className="space-y-2 text-muted-foreground">
                            <a
                                href="https://docs.openintents.xyz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:text-foreground transition-colors"
                            >
                                OIF Docs
                            </a>
                            <a
                                href="https://docs.interop.wonderland.xyz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:text-foreground transition-colors"
                            >
                                SDK Docs
                            </a>
                            <a
                                href="https://github.com/openintentsframework"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:text-foreground transition-colors"
                            >
                                GitHub
                            </a>
                            <a
                                href="https://github.com/defi-wonderland/interop-sdk"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:text-foreground transition-colors"
                            >
                                Interop SDK
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Ecosystem</h3>
                        <div className="space-y-2 text-muted-foreground">
                            <a
                                href="https://interopaddress.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:text-foreground transition-colors"
                            >
                                Interoperable Addresses
                            </a>
                            <a
                                href="https://ethereum.org"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:text-foreground transition-colors"
                            >
                                Ethereum
                            </a>
                        </div>
                    </div>
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
