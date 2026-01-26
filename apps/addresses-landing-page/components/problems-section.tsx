import { Section } from "./section";

export function ProblemsSection() {
    return (
        <Section id="about" title="Why do we need this?" padding="tight-top">
            <div className="space-y-8 md:space-y-9 lg:space-y-10">
                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-2.5 lg:mb-3">
                        Ethereum is multichain
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        Apps, wallets, infrastructure providers and onchain protocols need ways to
                        refer to an account on a specific chain.
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-2.5 lg:mb-3">
                        Mistakes matter
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        Sending to the address on the wrong chain can mean lost funds.
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-2.5 lg:mb-3">
                        Ad hoc approaches
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        Currently apps, wallets, and protocols implement ad hoc approaches to
                        identifying a chain-specific address, leading to fragmentation and hindering
                        interoperability.
                    </p>
                </div>

                <div>
                    <h3 className="font-mono text-base lg:text-lg font-medium mb-2.5 lg:mb-3">
                        No good solutions today
                    </h3>
                    <p className="font-mono text-sm lg:text-[0.9375rem] text-muted-foreground leading-relaxed">
                        Existing standards do not work across use-cases and chains.
                    </p>
                </div>
            </div>
        </Section>
    );
}
