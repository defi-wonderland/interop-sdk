import { Section } from "./section";

interface Contributor {
    name: string;
    url: string;
}

const CONTRIBUTORS: Contributor[] = [
    { name: "Across", url: "https://across.to" },
    { name: "Arbitrum", url: "https://arbitrum.io" },
    { name: "Biconomy", url: "https://biconomy.io" },
    { name: "BootNode", url: "https://bootnode.dev" },
    { name: "Caldera", url: "https://caldera.xyz" },
    { name: "Eco", url: "https://eco.org" },
    { name: "ENS", url: "https://ens.domains" },
    { name: "Epoch Protocol", url: "https://epochprotocol.xyz" },
    { name: "Espresso", url: "https://espressosys.com" },
    { name: "EF", url: "https://ethereum.org/foundation/" },
    { name: "Everclear", url: "https://everclear.org" },
    { name: "Fuel Network", url: "https://fuel.network" },
    { name: "Gelato", url: "https://gelato.network" },
    { name: "Gnosis", url: "https://gnosis.io" },
    { name: "Hyperlane", url: "https://hyperlane.xyz" },
    { name: "Khalani", url: "https://khalani.network" },
    { name: "LI.FI", url: "https://li.fi" },
    { name: "Linea", url: "https://linea.build" },
    { name: "Nomial", url: "https://nomial.io" },
    { name: "OpenZeppelin", url: "https://openzeppelin.com" },
    { name: "Optimism", url: "https://optimism.io" },
    { name: "Polygon", url: "https://polygon.technology" },
    { name: "Polymer", url: "https://polymerlabs.org" },
    { name: "Scroll", url: "https://scroll.io" },
    { name: "Soneium", url: "https://soneium.org" },
    { name: "Starknet", url: "https://starknet.io" },
    { name: "Succinct", url: "https://succinct.xyz" },
    { name: "Superbridge", url: "https://superbridge.app" },
    { name: "T1", url: "https://www.t1protocol.com" },
    { name: "Taiko", url: "https://taiko.xyz" },
    { name: "Unruggable", url: "https://unruggable.com" },
    { name: "Uniswap", url: "https://uniswap.org" },
    { name: "Wonderland", url: "https://wonderland.xyz" },
];

export function ContributorsSection() {
    return (
        <Section id="contributors">
            <div className="text-left mb-10">
                <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-muted-foreground/60">
                    Contributors
                </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {CONTRIBUTORS.map((contributor) => (
                    <a
                        key={contributor.name}
                        href={contributor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
                    >
                        <img
                            src={`/favicons/${new URL(contributor.url).hostname}.png`}
                            alt={`${contributor.name} logo`}
                            width={16}
                            height={16}
                            className="size-4 rounded-sm"
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                        />
                        {contributor.name}
                    </a>
                ))}
            </div>
        </Section>
    );
}
