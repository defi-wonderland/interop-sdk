import Image from "next/image";

export function HowItWorksSection() {
    return (
        <section id="about" className="px-6 lg:px-16 py-24 bg-gray-50">
            <div className="max-w-5xl mx-auto">
                <h2 className="font-mono text-2xl lg:text-4xl font-light mb-6 lg:mb-8">
                    How does it work?
                </h2>

                <p className="text-sm lg:text-md text-gray-600 mb-12 lg:mb-20 max-w-3xl">
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
