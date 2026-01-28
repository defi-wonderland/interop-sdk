import { Button } from "@/components/ui/button";

import { Section } from "./section";

export function DemoSection() {
    return (
        <Section title="Interactive Playground" maxWidth="5xl">
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white mb-6 md:mb-7 lg:mb-8">
                <div className="relative h-[60vh] md:h-[70vh] lg:h-[75vh]">
                    <iframe
                        src="https://interop.wonderland.xyz/addresses"
                        className="absolute inset-0 w-full h-full"
                        title="Interoperable Addresses Interactive Playground"
                        allowFullScreen
                    />
                </div>
            </div>

            <div>
                <Button size="lg" className="font-mono" asChild>
                    <a
                        href="https://interop.wonderland.xyz/addresses"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open in New Tab →
                    </a>
                </Button>
            </div>
        </Section>
    );
}
