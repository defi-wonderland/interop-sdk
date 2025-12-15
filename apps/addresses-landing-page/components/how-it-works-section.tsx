import Image from "next/image";

export function HowItWorksSection() {
    return (
        <section id="about" className="px-6 lg:px-16 py-20 lg:py-24">
            <div className="max-w-5xl mx-auto">
                <h2 className="font-mono text-[1.75rem] leading-[1.2] md:text-3xl md:leading-tight lg:text-4xl lg:leading-tight font-light mb-5 md:mb-7 lg:mb-8">
                    How does it work?
                </h2>

                <p className="font-mono text-sm md:text-[0.9375rem] lg:text-base text-gray-600 mb-12 md:mb-16 lg:mb-20 max-w-3xl leading-relaxed">
                    ERC-7930 establishes the base binary format, while ERC-7828 extends it with
                    human-readable names using ENS and an on-chain chain registry.
                </p>

                <Image
                    src="/interop-addresses-diagram.svg"
                    alt="How it works"
                    className="w-full max-h-screen object-contain lg:mx-0 lg:px-32"
                    width={1000}
                    height={1000}
                />
            </div>
        </section>
    );
}
