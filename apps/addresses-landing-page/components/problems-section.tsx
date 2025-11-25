export function ProblemsSection() {
    return (
        <section id="about" className="px-6 lg:px-16 py-24">
            <div className="max-w-3xl">
                <h2 className="font-mono text-4xl font-light mb-16">
                    Why do we need{" "}
                    <span className="md:whitespace-nowrap">interoperable addresses?</span>
                </h2>

                <div className="space-y-12 mb-24">
                    <div>
                        <h3 className="font-mono text-lg mb-3">Wrong chain, lost funds</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            Addresses don&apos;t specify which chain they belong to. This means
                            chain information must be expressed out of band, and introduces the risk
                            of an address being mistakenly used on a chain it is not valid for.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-3">Readability and typos</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            Existing systems rely heavily on hexadecimal strings and other opaque
                            identifiers, with limited checks for correct data entry.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-3">Centralized chain information</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            Chain identification depends on centralized offchain repositories, which
                            act as a bottleneck exposed to hacks and human errors.
                        </p>
                    </div>
                </div>

                <h2 className="font-mono text-4xl font-light mb-16">
                    With Interoperable Addresses
                </h2>

                <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
                    <div>
                        <h3 className="font-mono text-lg mb-3">Chain specificity</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            Addresses explicitly include which chain they belong to
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-3">Compact format</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            For use in cross-chain messaging and intent declaration
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-3">Error prevention</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            Additional checksum validation to detect potential errors
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-3">Human-readability</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            ENS integration means support human-readable names as well as long
                            hexadecimal addresses
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-3">Onchain registry</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            Chain identifiers are stored on-chain without dependency on centralized
                            repositories
                        </p>
                    </div>

                    <div>
                        <h3 className="font-mono text-lg mb-3">Universal compatibility</h3>
                        <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                            Works with any chain type, EVM or non-EVM
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
