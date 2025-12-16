import { TerminalSnippet } from "@/components/terminal-snippet";

export function SdkSection() {
    return (
        <section id="sdk" className="px-6 lg:px-16 py-20 lg:py-24">
            <div className="max-w-3xl">
                <h2 className="font-mono text-[1.75rem] leading-[1.2] md:text-3xl md:leading-tight lg:text-4xl lg:leading-tight font-light mb-12 md:mb-16 lg:mb-20">
                    SDK & Implementation
                </h2>
                <div>
                    <p className="font-mono text-sm md:text-[0.9375rem] lg:text-base text-muted-foreground mb-8 leading-relaxed">
                        Install our SDK to implement Interoperable Addresses in your application.
                    </p>
                    <TerminalSnippet />
                    <a
                        href="https://github.com/defi-wonderland/interop-sdk/tree/main/packages/addresses#readme"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm underline hover:no-underline"
                    >
                        View Documentation →
                    </a>
                </div>
            </div>
        </section>
    );
}
