import { ArrowLeftRight, Blocks, Cable, Wallet } from "lucide-react";

import { Section } from "./section";

const AUDIENCES = [
    {
        icon: Blocks,
        title: "For Chains",
        description:
            "Deploy OIF contracts, The Compact, and Broadcaster, run OIF solvers to connect with the Ethereum ecosystem.",
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
            "Integrate the interop-sdk to add cross-chain and interoperable addresses to your application.",
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
        </Section>
    );
}
