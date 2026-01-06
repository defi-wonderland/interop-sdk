"use client";

import { TerminalSnippet } from "@/components/terminal-snippet";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function HeroSection() {
    const [showNavbar, setShowNavbar] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowNavbar(window.scrollY > 260);
        };

        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <section className="flex flex-col justify-center px-6 py-12 lg:py-16 lg:px-16">
            {/* Sticky navbar that appears on scroll */}
            <nav
                className={`hidden lg:flex fixed top-0 left-[40%] right-0 max-w-[calc(1400px+40%)] bg-[#fcfcfc]/95 backdrop-blur-sm px-16 py-4 border-b border-gray-200 z-20 items-center justify-between transition-transform duration-300 ${
                    showNavbar ? "translate-y-0" : "-translate-y-full"
                }`}
            >
                <div className="font-mono text-lg font-light text-[oklch(0.22_0.11_269.06)]">
                    Interoperable Addresses
                </div>
                <div className="flex items-center gap-6 font-mono text-sm">
                    <a
                        href="https://interop.wonderland.xyz/addresses"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#3441C0] transition-colors font-semibold"
                    >
                        Demo ↗
                    </a>
                    <span className="text-muted-foreground">|</span>
                    <a href="#specs" className="hover:text-[#3441C0] transition-colors">
                        Specs
                    </a>
                    <span className="text-muted-foreground">|</span>
                    <a href="#sdk" className="hover:text-[#3441C0] transition-colors">
                        SDK
                    </a>
                    <span className="text-muted-foreground">|</span>
                    <a href="#faq" className="hover:text-[#3441C0] transition-colors">
                        FAQ
                    </a>
                </div>
            </nav>

            {/* Static hero header */}
            <div className="mb-8 lg:mb-12">
                <h1 className="font-mono text-[2rem] leading-[1.1] md:text-5xl md:leading-tight lg:text-6xl lg:leading-tight font-light text-[oklch(0.22_0.11_269.06)] mb-4 md:mb-5 lg:mb-5">
                    Interoperable
                    <br />
                    Addresses
                </h1>
                <div className="flex items-center gap-3 lg:gap-6 font-mono text-xs lg:text-sm text-[oklch(0.22_0.11_269.06)]">
                    <a
                        href="https://interop.wonderland.xyz/addresses"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#3441C0] transition-colors font-semibold"
                    >
                        Demo ↗
                    </a>
                    <span className="text-muted-foreground">|</span>
                    <a href="#specs" className="hover:text-[#3441C0] transition-colors">
                        Specs
                    </a>
                    <span className="text-muted-foreground">|</span>
                    <a href="#sdk" className="hover:text-[#3441C0] transition-colors">
                        SDK
                    </a>
                    <span className="text-muted-foreground">|</span>
                    <a href="#faq" className="hover:text-[#3441C0] transition-colors">
                        FAQ
                    </a>
                </div>
            </div>

            <div>
                <div className="font-mono text-xs md:text-sm lg:text-base mb-4 lg:mb-5">
                    <span className="text-muted-foreground">ERC-7930</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="text-muted-foreground">ERC-7828</span>
                </div>

                <h2 className="font-mono text-[1.375rem] leading-[1.35] md:text-3xl md:leading-relaxed lg:text-4xl lg:leading-relaxed font-light mb-3 md:mb-4 lg:mb-4 max-w-xl">
                    Chain-aware addressing for the Ethereum ecosystem
                </h2>

                <p className="font-mono text-[0.9375rem] leading-relaxed md:text-base lg:text-lg text-muted-foreground mb-5 md:mb-6 lg:mb-8 max-w-xl">
                    Simplify interoperability and eliminate cross-chain mistakes with human-readable
                    addresses that include chain information.
                </p>

                <div className="max-w-xl mb-5 md:mb-6 lg:mb-8">
                    <TerminalSnippet />
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                    <Button size="lg" className="font-mono" asChild>
                        <a href="#specs">Read the Specs</a>
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="font-mono bg-transparent"
                        asChild
                    >
                        <a
                            href="https://github.com/defi-wonderland/interop-sdk"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View on GitHub
                        </a>
                    </Button>
                </div>
            </div>
        </section>
    );
}
