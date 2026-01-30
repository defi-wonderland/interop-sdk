import { type ReactNode } from "react";

interface SectionProps {
    id?: string;
    title?: string;
    children: ReactNode;
    maxWidth?: "3xl" | "5xl" | "6xl";
    centerContent?: boolean;
    padding?: "default" | "tight-top";
    className?: string;
}

export function Section({
    id,
    title,
    children,
    maxWidth = "3xl",
    centerContent = false,
    padding = "default",
    className = "",
}: SectionProps) {
    const paddingClasses =
        padding === "tight-top"
            ? "px-6 lg:px-16 pt-2 lg:pt-4 pb-6 lg:pb-8"
            : "px-6 lg:px-16 py-6 lg:py-8";

    const maxWidthClasses = {
        "3xl": "max-w-3xl",
        "5xl": "max-w-5xl",
        "6xl": "max-w-6xl",
    };

    const containerClasses = `${maxWidthClasses[maxWidth]} ${centerContent ? "mx-auto" : ""}`;

    return (
        <section id={id} className={`${paddingClasses} ${className}`}>
            <div className={containerClasses}>
                {title && (
                    <h2 className="font-mono text-[1.75rem] leading-[1.2] md:text-3xl md:leading-tight lg:text-4xl lg:leading-tight font-light mb-4 md:mb-5 lg:mb-6">
                        {title}
                    </h2>
                )}
                {children}
            </div>
        </section>
    );
}
