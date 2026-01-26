import { TerminalSnippet } from "@/components/terminal-snippet";

import { Section } from "./section";

export function SdkSection() {
    return (
        <Section id="sdk" title="SDK & Implementation">
            <div>
                <p className="font-mono text-sm md:text-[0.9375rem] lg:text-base text-muted-foreground mb-8 leading-relaxed">
                    Install the SDK to implement Interoperable Addresses in your application.
                </p>
                <TerminalSnippet />
                <a
                    href="https://docs.interop.wonderland.xyz/addresses"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm underline hover:no-underline"
                >
                    View Documentation →
                </a>
            </div>
        </Section>
    );
}
