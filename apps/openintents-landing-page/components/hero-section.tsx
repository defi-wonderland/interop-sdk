"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";

import { TentLogo } from "./tent-logo";

const HERO_SCROLL_THRESHOLD = 300;

export interface HeroSectionProps {
    onScrollPastHero: (scrolled: boolean) => void;
}

export function HeroSection({ onScrollPastHero }: HeroSectionProps) {
    const scrolledRef = useRef(false);

    useEffect(() => {
        const handleScroll = () => {
            const isPastHero = window.scrollY > HERO_SCROLL_THRESHOLD;
            if (scrolledRef.current !== isPastHero) {
                scrolledRef.current = isPastHero;
                onScrollPastHero(isPastHero);
            }
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [onScrollPastHero]);

    return (
        <section className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 md:pt-20 md:pb-14 lg:pt-28 lg:pb-16">
            <span className="inline-block font-mono text-xs md:text-sm uppercase tracking-widest text-accent border border-accent/30 rounded-full px-4 py-1.5 mb-6 md:mb-8">
                Ethereum ecosystem initiative
            </span>
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <span className="mb-8 md:mb-10 cursor-default" tabIndex={0}>
                        <TentLogo size={96} />
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-mono">in-tents, right?!</p>
                </TooltipContent>
            </Tooltip>
            <h1 className="font-mono text-4xl md:text-5xl lg:text-6xl font-light mb-6">
                Open Intents
            </h1>
            <p className="font-mono text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl">
                Improving Ethereum cross-chain UX
                <br />
                Maintaining freedom while minimising trust
            </p>
        </section>
    );
}
