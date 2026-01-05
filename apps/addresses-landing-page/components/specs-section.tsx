export function SpecsSection() {
    return (
        <section id="specs" className="px-6 lg:px-16 py-20 lg:py-24">
            <div className="max-w-3xl">
                <h2 className="font-mono text-[1.75rem] leading-[1.2] md:text-3xl md:leading-tight lg:text-4xl lg:leading-tight font-light mb-12 md:mb-16 lg:mb-20">
                    The Specifications
                </h2>

                <div className="space-y-16 md:space-y-18 lg:space-y-20">
                    <div>
                        <h3 className="font-mono text-2xl md:text-[1.75rem] lg:text-3xl font-light mb-3 lg:mb-4">
                            ERC-7930
                        </h3>
                        <h4 className="font-mono text-base md:text-lg lg:text-xl mb-5 lg:mb-6 text-muted-foreground">
                            Interoperable Addresses
                        </h4>
                        <p className="font-mono text-sm md:text-[0.9375rem] lg:text-base text-muted-foreground leading-relaxed mb-5 lg:mb-6">
                            Binary format that binds address and chain together — compact,
                            verifiable, and extensible across any blockchain ecosystem. Works with
                            any chain type, from EVM to non-EVM networks.
                        </p>
                        <a
                            href="https://eips.ethereum.org/EIPS/eip-7930"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm md:text-[0.9375rem] lg:text-base underline hover:no-underline"
                        >
                            View Specification →
                        </a>
                    </div>

                    <div>
                        <h3 className="font-mono text-2xl md:text-[1.75rem] lg:text-3xl font-light mb-3 lg:mb-4">
                            ERC-7828
                        </h3>
                        <h4 className="font-mono text-base md:text-lg lg:text-xl mb-5 lg:mb-6 text-muted-foreground">
                            Human-readable Interoperable Names
                        </h4>
                        <p className="font-mono text-sm md:text-[0.9375rem] lg:text-base text-muted-foreground leading-relaxed mb-5 lg:mb-6">
                            Defines a standard
                            {" <address>@<chain>"} text representation for an Interoperable Address,
                            supporting optional resolution of ENS names and readable chain
                            identifiers based on an on-chain registry.
                        </p>
                        <a
                            href="https://eips.ethereum.org/EIPS/eip-7828"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm md:text-[0.9375rem] lg:text-base underline hover:no-underline"
                        >
                            View Specification →
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
