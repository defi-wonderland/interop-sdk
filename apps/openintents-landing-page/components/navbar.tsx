"use client";

import { cn } from "@/lib/utils";

import { TentLogo } from "./tent-logo";

interface NavbarProps {
    visible: boolean;
}

const NAV_LINKS = [
    { href: "#principles", label: "Principles" },
    { href: "#solutions", label: "Solutions" },
    { href: "#for-you", label: "For You" },
    { href: "#contributors", label: "Contributors" },
] as const;

export function Navbar({ visible }: NavbarProps) {
    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border transition-transform duration-300",
                visible ? "translate-y-0" : "-translate-y-full",
            )}
        >
            <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-3 flex items-center justify-between">
                <a href="#" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <TentLogo size={28} />
                    <span className="font-mono text-sm font-light">Open Intents</span>
                </a>
                <div className="hidden md:flex items-center gap-6 font-mono text-sm">
                    {NAV_LINKS.map((link, i) => (
                        <span key={link.href} className="flex items-center gap-6">
                            {i > 0 && <span className="text-muted-foreground">|</span>}
                            <a href={link.href} className="hover:text-accent transition-colors">
                                {link.label}
                            </a>
                        </span>
                    ))}
                </div>
            </div>
        </nav>
    );
}
