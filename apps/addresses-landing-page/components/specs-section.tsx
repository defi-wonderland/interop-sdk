export function SpecsSection() {
    return (
        <section id="specs" className="px-6 lg:px-16 py-24">
            <div className="max-w-3xl">
                <h2 className="font-mono text-4xl font-light mb-20">The Specifications</h2>

                <div className="space-y-20">
                    <div>
                        <h3 className="font-mono text-3xl mb-4">ERC-7930</h3>
                        <h4 className="font-mono text-xl mb-6 text-muted-foreground">
                            Interoperable Addresses
                        </h4>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-6">
                            Binary format that binds address and chain together—compact, verifiable,
                            and extensible across any blockchain ecosystem, with a basic readable
                            name for usability. Works with any chain type, from EVM to non-EVM
                            networks.
                        </p>
                        <a
                            href="https://github.com/ethereum/ERCs/blob/7dde1ba4c67f5892ddb8f9c32d1c0351a3ab0a7e/ERCS/erc-7930.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm underline hover:no-underline"
                        >
                            View Specification →
                        </a>
                    </div>

                    <div>
                        <h3 className="font-mono text-3xl mb-4">ERC-7828</h3>
                        <h4 className="font-mono text-xl mb-6 text-muted-foreground">
                            Human-readable Interoperable Names
                        </h4>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-6">
                            Powered by ENS with an on-chain registry—making addresses and chain
                            identifiers accessible while maintaining technical precision. Extends
                            ERC-7930 by allowing resolution to shorter names using ENS. Replaces
                            centralized chain lists with a decentralized on-chain registry.
                        </p>
                        <a
                            href="https://github.com/ethereum/ERCs/blob/bd717b6ecb991c3fbf4b213e2ad9d98c6c49d1f5/ERCS/erc-7828.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm underline hover:no-underline"
                        >
                            View Specification →
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
