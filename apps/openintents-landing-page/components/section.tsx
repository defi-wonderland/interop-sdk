import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
    id?: string;
    title?: string;
    children: ReactNode;
    className?: string;
}

export function Section({ id, title, children, className }: SectionProps) {
    return (
        <section id={id} className={cn("px-6 md:px-12 lg:px-16 py-12 lg:py-16", className)}>
            <div className="max-w-6xl mx-auto">
                {title && (
                    <h2 className="font-mono text-2xl md:text-3xl lg:text-4xl font-light mb-6 md:mb-8">
                        {title}
                    </h2>
                )}
                {children}
            </div>
        </section>
    );
}
