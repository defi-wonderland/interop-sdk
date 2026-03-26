import { Section } from "./section";

export function FaqSection() {
    return (
        <Section id="faq" title="Frequently Asked Questions">
            <div className="space-y-8 md:space-y-9 lg:space-y-10">
                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-3 lg:mb-4">
                        Why two separate ERCs?
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        ERC-7930 provides the foundational binary format that works everywhere, but
                        is optimised for use in smart contracts. ERC-7828 focuses on human-readable
                        addresses, adding ENS integration for better UX and checksums for safe
                        sharing.
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-3 lg:mb-4">
                        What about chain abstraction?
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        These ERCs complement chain abstraction. While abstraction hides complexity,
                        interoperable addresses ensure safety when users DO need to know which chain
                        they&apos;re using. Think of it as &quot;abstraction with
                        transparency.&quot;
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-3 lg:mb-4">
                        Do I need to use ENS?
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        No. ERC-7930 works with raw addresses. ENS (via ERC-7828) is optional but
                        recommended for better UX.
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-3 lg:mb-4">
                        Does this work with non-EVM chains?
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        Yes! Both ERCs can support addresses on non-EVM chains throughout Ethereum,
                        and can be extended to support non-Ethereum chains such as Bitcoin. The
                        specifications build upon CAIP-350, a meta-specification that defines binary
                        encoding for blockchain addresses across different ecosystems.
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-3 lg:mb-4">
                        What is CAIP-350 and how does it relate to Interoperable Addresses?
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        CAIP-350 is a living specification from the Chain Agnostic Standards
                        Alliance that provides a template for how different blockchain ecosystems
                        serialize addresses and chain identifiers. Each blockchain namespace
                        (Ethereum, Bitcoin, Solana, etc.) maintains its own implementation profile.
                        ERC-7930 and ERC-7828 leverage this registry for serialization and
                        deserialization of chain-specific addresses.
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-3 lg:mb-4">
                        What kind of developers can use Interoperable Addresses?
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        Wallet and app developers can use Interoperable Addresses (ERC-7828 +
                        ERC-7930) to create standardized and legible send flows. Infrastructure
                        developers can simplify cross-chain interactions using the compact ERC-7930
                        binary standard.
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-3 lg:mb-4">
                        How do I get started as a developer?
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        Install the SDK: npm install @wonderland/interop-addresses. For
                        implementation examples and guides, see the{" "}
                        <a
                            href="https://docs.interop.wonderland.xyz/addresses"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                        >
                            Interop SDK documentation
                        </a>
                        .
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-3 lg:mb-4">
                        What is the status of the onchain chain registry?
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        <code>on.eth</code> is a canonical, ENS-native registry for chains and their
                        associated metadata, covering networks such as Base, Arbitrum, or Ethereum.
                        The ENS DAO has approved usage of the domain for this purpose, and the
                        registry is being initialized with chains using the{" "}
                        <a
                            href="https://github.com/unruggable-labs/chain-resolver/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                        >
                            custom chain resolver
                        </a>
                        . Learn more about the registry in the{" "}
                        <a
                            href="https://ens.domains/blog/post/on-eth-chain-registry"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                        >
                            ENS blog post
                        </a>
                        . The registry is available as an{" "}
                        <a
                            href="https://docs.interop.wonderland.xyz/addresses/getting-started#experimental-onchain-chain-registry"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                        >
                            experimental feature
                        </a>{" "}
                        in the <code>interop-addresses</code> package.
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-3 lg:mb-4">
                        What if a name resolves to different addresses?
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        The Interoperable Name specification includes 4-byte checksums calculated
                        over the resolved Interoperable Address. If a name resolves to a different
                        address or there&apos;s an error, the checksum won&apos;t match and will
                        alert about the problem. Checksums help prevent errors and detect
                        inconsistencies in resolution.
                    </p>
                </div>
            </div>
        </Section>
    );
}
