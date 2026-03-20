import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

export function CtaSection() {
    return (
        <section className="px-6 md:px-12 lg:px-16 py-16 lg:py-24">
            <div className="max-w-6xl mx-auto text-center">
                <h2 className="font-mono text-3xl md:text-4xl lg:text-5xl font-light mb-6">
                    Get Involved!
                </h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                    Join the Open Intents community and help shape the future of cross-chain
                    interoperability on Ethereum.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button asChild size="lg" className="font-mono">
                        <a
                            href="https://github.com/openintentsframework"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Github className="size-4" aria-hidden="true" />
                            GitHub
                        </a>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="font-mono">
                        <a
                            href="https://docs.openintents.xyz"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Documentation
                        </a>
                    </Button>
                </div>
            </div>
        </section>
    );
}
