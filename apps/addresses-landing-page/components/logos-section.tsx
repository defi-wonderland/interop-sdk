import Image from "next/image";

// Set 'width' based on VISUAL WEIGHT (heavier/bolder logos = smaller width):
const LOGOS = [
    {
        name: "Ethereum Foundation",
        src: "/logos/ethereum-foundation.svg",
        alt: "Ethereum Foundation",
        url: "https://ethereum.org",
        width: 170,
    },
    {
        name: "OpenZeppelin",
        src: "/logos/open-zepellin.svg",
        alt: "OpenZeppelin",
        url: "https://openzeppelin.com",
        width: 240,
    },
    {
        name: "LiFi",
        src: "/logos/lifi.svg",
        alt: "LiFi",
        url: "https://li.fi",
        width: 130,
    },
    {
        name: "Unruggable",
        src: "/logos/unruggable.svg",
        alt: "Unruggable",
        url: "https://unruggable.com",
        width: 200,
    },
    {
        name: "Offchain Labs",
        src: "/logos/offchain-labs.svg",
        alt: "Offchain Labs",
        url: "https://offchainlabs.com",
        width: 165,
    },
    {
        name: "ENS",
        src: "/logos/ens.svg",
        alt: "ENS",
        url: "https://ens.domains",
        width: 125,
    },
    {
        name: "Wonderland",
        src: "/logos/wonderland.svg",
        alt: "Wonderland",
        url: "https://defi.sucks",
        width: 220,
    },
] as const;

const maxWidth = Math.max(...LOGOS.map((logo) => logo.width));
const logosWithScale = LOGOS.map((logo) => ({
    ...logo,
    scale: logo.width / maxWidth,
}));

export function LogosSection() {
    return (
        <section className="px-6 lg:px-16 py-16">
            <div className="max-w-6xl mx-auto">
                <div className="text-left mb-16 pl-8">
                    <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground/60">
                        Backed by the Ethereum community
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-10 lg:gap-12 xl:gap-16 items-center">
                    {logosWithScale.map((logo) => (
                        <a
                            key={logo.name}
                            href={logo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-all duration-300 hover:opacity-70 flex items-center justify-center"
                        >
                            <div
                                style={{ transform: `scale(${logo.scale})` }}
                                className="w-full flex items-center justify-center"
                            >
                                <Image
                                    src={logo.src}
                                    alt={logo.alt}
                                    width={logo.width}
                                    height={80}
                                    className="w-full h-auto logo-filter"
                                    style={{
                                        filter: "brightness(0) saturate(100%) invert(7%) sepia(61%) saturate(5089%) hue-rotate(237deg) brightness(97%) contrast(106%)",
                                    }}
                                />
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}
