import { Button } from "@/components/ui/button";

export function DemoSection() {
    return (
        <section className="px-6 lg:px-16 py-20 lg:py-24">
            <div className="max-w-5xl">
                <h2 className="font-mono text-[1.75rem] leading-[1.2] md:text-3xl md:leading-tight lg:text-4xl lg:leading-tight font-light mb-5 md:mb-7 lg:mb-8">
                    Interactive Playground
                </h2>

                <p className="font-mono text-sm md:text-[0.9375rem] lg:text-base text-muted-foreground mb-8 md:mb-9 lg:mb-10 leading-relaxed max-w-2xl">
                    Convert between formats, test with real addresses, and validate checksums in
                    real-time. Experience how interoperable addresses work across different chains.
                </p>

                <div className="mb-8 md:mb-9 lg:mb-10">
                    <Button size="lg" className="font-mono" asChild>
                        <a
                            href="https://interop.wonderland.xyz"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open in New Tab →
                        </a>
                    </Button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="relative h-[60vh] md:h-[70vh] lg:h-[75vh]">
                        <iframe
                            src="https://interop.wonderland.xyz/"
                            className="absolute inset-0 w-full h-full"
                            title="Interoperable Addresses Interactive Playground"
                            allowFullScreen
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
