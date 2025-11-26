import { Button } from "@/components/ui/button";

export function DemoSection() {
    return (
        <section className="px-6 lg:px-16 py-24 bg-gray-50">
            <div className="max-w-5xl">
                <h2 className="font-mono text-4xl font-light mb-8">See it in action</h2>

                <p className="font-mono text-md text-muted-foreground mb-12 leading-relaxed max-w-2xl">
                    Experience Interoperable Addresses with our interactive playground. Convert
                    between formats, test with real addresses, and validate checksums in real-time.
                </p>

                <a
                    href="https://interop.wonderland.xyz /"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mb-12 group"
                >
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:border-gray-300 transition-colors cursor-pointer">
                        <div className="aspect-video bg-gradient-to-br from-[#1a1f4d] to-[#2a3f6d] flex items-center justify-center relative overflow-hidden">
                            {/* Placeholder for screenshot */}
                            <div className="absolute inset-0 flex items-center justify-center text-white/60 font-mono text-sm">
                                <div className="text-center">
                                    <div className="text-6xl mb-4">🎯</div>
                                    <div className="text-lg font-semibold mb-2">
                                        Interactive Demo
                                    </div>
                                    <div className="text-sm">Click to launch playground</div>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-mono">
                                Live Demo
                            </div>
                        </div>
                    </div>
                </a>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <Button size="lg" className="font-mono" asChild>
                        <a
                            href="https://interop.wonderland.xyz /"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Launch Interactive Demo →
                        </a>
                    </Button>
                </div>
            </div>
        </section>
    );
}
