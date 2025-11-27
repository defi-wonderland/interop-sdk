export function FaqSection() {
    return (
        <section id="faq" className="px-6 lg:px-16 py-24">
            <div className="max-w-3xl">
                <h2 className="font-mono text-2xl lg:text-4xl font-light mb-12 lg:mb-20">
                    Frequently Asked Questions
                </h2>

                <div className="space-y-8 lg:space-y-10">
                    <div>
                        <h3 className="font-mono text-lg mb-4">Why two separate ERCs?</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            ERC-7930 provides the foundational binary format that works everywhere.
                            ERC-7828 adds ENS integration for better UX. You can use 7930 alone, or
                            enhance it with 7828.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-4">What about chain abstraction?</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            These ERCs complement chain abstraction. While abstraction hides
                            complexity, interoperable addresses ensure safety when users DO need to
                            know which chain they&apos;re using. Think of it as &quot;abstraction
                            with transparency.&quot;
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-4">Do I need to use ENS?</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            No. ERC-7930 works with raw addresses. ENS (via ERC-7828) is optional
                            but recommended for better UX.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-4">
                            Does this work with non-EVM chains?
                        </h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            Yes! Both ERCs can support addresses on Bitcoin, Solana, and any
                            CAIP-supported chains.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-4">
                            What kind of developers can use Interoperable Addresses?
                        </h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            Wallet and app developers can use Interoperable Addresses (ERC-7828 +
                            ERC-7930) to create standardized and legible send flows. Infrastructure
                            developers can simplify cross-chain interactions using the compact
                            ERC-7930 binary standard.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-4">
                            How do I get started as a developer?
                        </h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            Install our SDK: npm install @defi-wonderland/interop-addresses. See
                            docs for implementation examples.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-4">
                            What if a name resolves to different addresses?
                        </h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            The standard includes 4-byte checksums calculated over the binary
                            format. If a name resolves to a different address or there&apos;s an
                            error, the checksum won&apos;t match and will alert about the problem.
                            Checksums help prevent errors and detect inconsistencies in resolution.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
