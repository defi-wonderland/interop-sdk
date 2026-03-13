import Image from "next/image";

import { Section } from "./section";

export function HowItWorksSection() {
    return (
        <Section id="about" title="How does it work?" maxWidth="5xl" centerContent>
            <p className="font-mono text-sm md:text-[0.9375rem] lg:text-base text-gray-600 mb-8 max-w-3xl leading-relaxed">
                <strong>ERC-7930</strong>: a compact binary Interoperable Address format for use in
                smart contracts and other machine-readable contexts.
                <br />
                <strong>ERC-7828</strong>: an Interoperable Name format for end-users, optionally
                using ENS and an onchain chain registry for maximum readability.
                <br />
                <br />
                These standards work together to support interoperability use-cases across Ethereum.
            </p>

            <Image
                src="/interop-addresses-diagram.svg"
                alt="How it works"
                className="w-full max-w-2xl mx-auto lg:max-w-4xl object-contain"
                width={1000}
                height={1000}
            />
        </Section>
    );
}
