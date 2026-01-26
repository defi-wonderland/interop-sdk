import { Button } from "@/components/ui/button";

export function DemoSection() {
    return (
        <section className="px-6 lg:px-16 py-8 lg:py-10">
            <div className="max-w-5xl">
                <h2 className="font-mono text-[1.75rem] leading-[1.2] md:text-3xl md:leading-tight lg:text-4xl lg:leading-tight font-light mb-4 md:mb-5 lg:mb-6">
                    Interactive Playground
                </h2>

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
            </div>
        </section>
    );
}
