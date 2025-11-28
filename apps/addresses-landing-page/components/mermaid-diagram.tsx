"use client";

import mermaid from "mermaid";
import { useEffect, useRef } from "react";

interface MermaidDiagramProps {
    chart: string;
    className?: string;
}

export function MermaidDiagram({ chart, className = "" }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            mermaid.initialize({
                startOnLoad: true,
                theme: "base",
                themeVariables: {
                    primaryColor: "#dbeafe",
                    primaryTextColor: "#1e3a8a",
                    primaryBorderColor: "#3b82f6",
                    lineColor: "#6b7280",
                    secondaryColor: "#fef3c7",
                    tertiaryColor: "#d1fae5",
                    fontSize: "12px",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                },
                flowchart: {
                    nodeSpacing: 50,
                    rankSpacing: 2,
                    padding: 15,
                    useMaxWidth: true,
                    curve: "linear",
                    wrappingWidth: 400,
                },
            });

            const renderDiagram = async () => {
                if (containerRef.current) {
                    try {
                        const { svg } = await mermaid.render("mermaid-diagram", chart);
                        containerRef.current.innerHTML = svg;
                    } catch (error) {
                        console.error("Error rendering mermaid diagram:", error);
                    }
                }
            };

            renderDiagram();
        }
    }, [chart]);

    return <div ref={containerRef} className={className} />;
}
