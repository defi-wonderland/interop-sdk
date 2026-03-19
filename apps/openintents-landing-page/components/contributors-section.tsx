import { Section } from "./section";

const CONTRIBUTORS = [
    "Across",
    "Arbitrum",
    "Biconomy",
    "BootNode",
    "Caldera",
    "Eco",
    "Ethereum Foundation",
    "Epoch Protocol",
    "Espresso",
    "Everclear",
    "Fuel Network",
    "Gelato",
    "Gnosis",
    "Hashi",
    "Hyperlane",
    "Khalani",
    "LI.FI",
    "Linea",
    "ENS",
    "Nomial",
    "OpenZeppelin",
    "Optimism",
    "Polygon",
    "Polymer",
    "Scroll",
    "Soneium",
    "Starknet",
    "Succinct",
    "Superbridge",
    "T1",
    "Taiko",
    "Uniswap",
    "Wonderland",
] as const;

export function ContributorsSection() {
    return (
        <Section id="contributors">
            <div className="text-left mb-10">
                <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-muted-foreground/60">
                    Contributors
                </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {CONTRIBUTORS.map((name) => (
                    <div
                        key={name}
                        className="flex items-center justify-center rounded-lg border border-border bg-card px-4 py-5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
                    >
                        {name}
                    </div>
                ))}
            </div>
        </Section>
    );
}
