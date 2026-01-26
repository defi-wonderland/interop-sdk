import { Section } from "./section";

export function SpecsSection() {
    return (
        <Section id="specs" title="The Specifications">
            <div className="space-y-10 md:space-y-12 lg:space-y-14">
                <div>
                    <h3 className="font-mono text-2xl md:text-[1.75rem] lg:text-3xl font-light mb-3 lg:mb-4">
                        CAIP-350
                    </h3>
                    <h4 className="font-mono text-base md:text-lg lg:text-xl mb-5 lg:mb-6 text-muted-foreground">
                        Cross-Chain Address Serialization
                    </h4>
                    <p className="font-mono text-sm md:text-[0.9375rem] lg:text-base text-muted-foreground leading-relaxed mb-5 lg:mb-6">
                        Living specification that defines how blockchain addresses and chain
                        identifiers are serialized. Each blockchain namespace (Ethereum, Bitcoin,
                        Solana, etc.) maintains its own implementation profile.
                    </p>
                    <a
                        href="https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-350.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm md:text-[0.9375rem] lg:text-base underline hover:no-underline"
                    >
                        View Specification →
                    </a>
                </div>

                <div>
                    <h3 className="font-mono text-2xl md:text-[1.75rem] lg:text-3xl font-light mb-3 lg:mb-4">
                        ERC-7930
                    </h3>
                    <h4 className="font-mono text-base md:text-lg lg:text-xl mb-5 lg:mb-6 text-muted-foreground">
                        Interoperable Addresses
                    </h4>
                    <p className="font-mono text-sm md:text-[0.9375rem] lg:text-base text-muted-foreground leading-relaxed mb-5 lg:mb-6">
                        Binary format that binds address and chain together — compact, verifiable,
                        and extensible across any blockchain ecosystem, as long as they have a
                        CAIP-350 profile.
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
                        {" <address>@<chain>"} text representation, supporting optional resolution
                        of ENS names and readable chain identifiers based on an on-chain registry.
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
        </Section>
    );
}
