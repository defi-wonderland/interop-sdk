"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { TentLogo } from "./tent-logo";

export function HeroSection() {
    return (
        <section className="flex flex-col items-center justify-center px-6 pt-6 pb-4 md:pt-8 md:pb-6 lg:pt-10 lg:pb-8">
            <span className="inline-block font-mono text-xs md:text-sm uppercase tracking-widest text-accent border border-accent/30 rounded-full px-4 py-1.5 mb-4 md:mb-6">
                Ethereum ecosystem initiative
            </span>
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <div className="flex items-center cursor-default" tabIndex={0}>
                        <TentLogo size={48} className="md:hidden" />
                        <TentLogo size={56} className="hidden md:block lg:hidden" />
                        <TentLogo size={64} className="hidden lg:block" />
                        <h1 className="font-mono text-4xl md:text-5xl lg:text-6xl font-light ml-4 md:ml-6">
                            Open Intents
                        </h1>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-mono">in-tents, right?!</p>
                </TooltipContent>
            </Tooltip>
            <p className="text-muted-foreground text-center max-w-2xl mt-4 md:mt-6 leading-relaxed">
                Improving the cross-chain user experience while maintaining freedom and minimising
                trust.
            </p>
        </section>
    );
}
