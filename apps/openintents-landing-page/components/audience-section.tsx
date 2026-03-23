import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Blocks, Cable, Github, Wallet } from "lucide-react";

import { Section } from "./section";

const AUDIENCES = [
    {
        icon: Blocks,
        title: "For Chains",
        description:
            "Deploy OIF contracts, The Compact, and Broadcaster, run OIF solvers to connect to the Ethereum ecosystem.",
    },
    {
        icon: Cable,
        title: "For Infrastructure Providers",
        description:
            "Integrate the OIF, add support for cross-chain addresses, leverage trust-minimised settlement solutions.",
    },
    {
        icon: ArrowLeftRight,
        title: "For Interoperability Protocols",
        description: "Integrate onchain and API standards, get supported in the interop-sdk.",
    },
    {
        icon: Wallet,
        title: "For Wallets & Applications",
        description:
            "Integrate the interop-sdk to add cross-chain capabilities to your application.",
    },
] as const;

export function AudienceSection() {
    return (
        <Section id="for-you" title="Open Intents for You">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
                {AUDIENCES.map((audience) => (
                    <div
                        key={audience.title}
                        className="rounded-lg border border-border bg-card p-6 lg:p-8 hover:border-accent/50 transition-colors"
                    >
                        <audience.icon
                            className="size-7 text-accent mb-4"
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                        <h3 className="font-mono text-base font-medium mb-2">{audience.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {audience.description}
                        </p>
                    </div>
                ))}
            </div>
            <div className="text-center mt-8 lg:mt-12">
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
                    Join the Open Intents community and help shape the future of cross-chain
                    interoperability on Ethereum.
                </p>
            </div>
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
        </Section>
    );
}
