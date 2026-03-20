import { TentLogo } from "./tent-logo";

const NAV_LINKS = [
    { href: "#principles", label: "Principles" },
    { href: "#for-you", label: "For You" },
    { href: "#solutions", label: "Solutions" },
    { href: "#contributors", label: "Contributors" },
] as const;

export function Navbar() {
    return (
        <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
            <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-3 flex items-center justify-between flex-nowrap">
                <a
                    href="#"
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
                >
                    <TentLogo size={28} />
                    <span className="font-mono text-sm font-light">Open Intents</span>
                </a>
                <div className="hidden md:flex items-center gap-4 lg:gap-6 font-mono text-sm shrink-0">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className="hover:text-accent transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
            </div>
        </nav>
    );
}
