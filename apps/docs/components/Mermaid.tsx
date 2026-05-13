import { useEffect, useId, useState } from "react";

type MermaidApi = typeof import("mermaid").default;
type MermaidTheme = "default" | "dark";

let mermaidPromise: Promise<MermaidApi> | null = null;

function getMermaid(): Promise<MermaidApi> {
    if (!mermaidPromise) {
        mermaidPromise = import("mermaid").then((m) => {
            m.default.initialize({ startOnLoad: false });
            return m.default;
        });
    }
    return mermaidPromise;
}

function readTheme(): MermaidTheme {
    if (typeof document === "undefined") return "default";
    return document.documentElement.classList.contains("dark") ? "dark" : "default";
}

type MermaidProps = {
    chart: string;
};

export function Mermaid({ chart }: MermaidProps) {
    const id = useId();
    const [svg, setSvg] = useState<string | null>(null);
    const [theme, setTheme] = useState<MermaidTheme>("default");

    useEffect(() => {
        setTheme(readTheme());
        const observer = new MutationObserver(() => setTheme(readTheme()));
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const mermaid = await getMermaid();
            const renderId = `mermaid-${id.replace(/:/g, "")}`;
            const themed = `%%{init: { 'theme': '${theme}' } }%%\n${chart}`;
            const { svg } = await mermaid.render(renderId, themed);
            if (!cancelled) setSvg(svg);
        })().catch(() => {
            if (!cancelled) setSvg(null);
        });
        return () => {
            cancelled = true;
        };
    }, [chart, id, theme]);

    return (
        <div
            className="mermaid-diagram"
            style={{ display: "flex", justifyContent: "center" }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: rendered SVG from mermaid with default strict sanitization
            dangerouslySetInnerHTML={{ __html: svg ?? "" }}
        />
    );
}
