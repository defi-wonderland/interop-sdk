"use client";

import { useEffect, useState } from "react";

export function MobileNavbar() {
    const [showNavbar, setShowNavbar] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowNavbar(window.scrollY > 260);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={`fixed left-0 top-0 w-full lg:hidden z-20 bg-white border-b border-gray-200 transition-transform duration-300 ${
                showNavbar ? "translate-y-0" : "-translate-y-full"
            }`}
        >
            <div className="flex flex-col items-center py-4 px-6">
                <h1 className="font-mono text-base font-semibold text-[oklch(0.22_0.11_269.06)] text-center mb-2">
                    Interoperable Addresses
                </h1>
                <div className="flex justify-center gap-3 font-mono text-xs text-[oklch(0.22_0.11_269.06)]">
                    <a
                        href="https://interop.wonderland.xyz"
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
        </nav>
    );
}
