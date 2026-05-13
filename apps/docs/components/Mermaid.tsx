import { useEffect, useId, useState } from "react";

type MermaidProps = {
    chart: string;
};

export function Mermaid({ chart }: MermaidProps) {
    const id = useId();
    const [svg, setSvg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const mermaid = (await import("mermaid")).default;
            mermaid.initialize({
                startOnLoad: false,
                theme: "default",
                securityLevel: "loose",
            });
            const renderId = `mermaid-${id.replace(/:/g, "")}`;
            const { svg } = await mermaid.render(renderId, chart);
            if (!cancelled) setSvg(svg);
        })().catch(() => {
            if (!cancelled) setSvg(null);
        });
        return () => {
            cancelled = true;
        };
    }, [chart, id]);

    return (
        <div
            className="mermaid-diagram"
            style={{ display: "flex", justifyContent: "center" }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered SVG from trusted mermaid output
            dangerouslySetInnerHTML={{ __html: svg ?? "" }}
        />
    );
}
