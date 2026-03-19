import { Globe, ShieldCheck, Shuffle } from "lucide-react";

import { Section } from "./section";

const PRINCIPLES = [
    {
        icon: Globe,
        title: "Accessibility",
        description:
            "Making interoperability accessible and usable for chains, developers and users.",
    },
    {
        icon: Shuffle,
        title: "Choice",
        description:
            "Ensuring developers and end-users have freedom and flexibility, combating lock-in and walled gardens.",
    },
    {
        icon: ShieldCheck,
        title: "Trust-minimisation",
        description: "Providing solutions that reduce dependence on centralised actors.",
    },
] as const;

export function PrinciplesSection() {
    return (
        <Section id="principles" title="Principles">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {PRINCIPLES.map((principle) => (
                    <div
                        key={principle.title}
                        className="rounded-lg border border-border bg-card p-6 lg:p-8"
                    >
                        <principle.icon
                            className="size-8 text-accent mb-4"
                            strokeWidth={1.5}
                            aria-hidden="true"
                        />
                        <h3 className="font-mono text-lg font-medium mb-3">{principle.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {principle.description}
                        </p>
                    </div>
                ))}
            </div>
        </Section>
    );
}
