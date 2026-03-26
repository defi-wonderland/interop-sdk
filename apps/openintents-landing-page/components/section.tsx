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
        <section
            id={id}
            className={cn("px-6 md:px-12 lg:px-16 py-8 lg:py-12 scroll-mt-14", className)}
        >
            <div className="max-w-6xl mx-auto">
                {title && (
                    <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl font-semibold mb-4 md:mb-6">
                        {title}
                    </h2>
                )}
                {children}
            </div>
        </section>
    );
}
