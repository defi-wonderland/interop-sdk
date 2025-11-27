import { Button } from "@/components/ui/button";

export function DemoSection() {
    return (
        <section className="px-6 lg:px-16 py-24 bg-gray-50">
            <div className="max-w-5xl">
                <h2 className="font-mono text-2xl lg:text-4xl font-light mb-6 lg:mb-8">
                    Interactive Playground
                </h2>

                <p className="font-mono text-xs lg:text-sm text-muted-foreground mb-6 lg:mb-8 leading-relaxed max-w-2xl">
                    Convert between formats, test with real addresses, and validate checksums in
                    real-time. Experience how interoperable addresses work across different chains.
                </p>

                <div className="mb-6 lg:mb-8">
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
                    <div className="relative h-[60vh] lg:h-[75vh]">
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
