import { useEffect, useId, useState, useSyncExternalStore } from "react";

type MermaidApi = typeof import("mermaid").default;
type MermaidTheme = "default" | "dark";

let mermaidPromise: Promise<MermaidApi> | null = null;

function getMermaid(): Promise<MermaidApi> {
    if (!mermaidPromise) {
        mermaidPromise = import("mermaid")
            .then((m) => {
                m.default.initialize({ startOnLoad: false });
                return m.default;
            })
            .catch((err) => {
                mermaidPromise = null;
                throw err;
            });
    }
    return mermaidPromise;
}

function readTheme(): MermaidTheme {
    if (typeof document === "undefined") return "default";
    return document.documentElement.classList.contains("dark") ? "dark" : "default";
}

function subscribeTheme(cb: () => void): () => void {
    const observer = new MutationObserver(cb);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
    });
    return () => observer.disconnect();
}

function useTheme(): MermaidTheme {
    return useSyncExternalStore(subscribeTheme, readTheme, () => "default" as const);
}

type MermaidProps = {
    chart: string;
};

export function Mermaid({ chart }: MermaidProps) {
    const id = useId();
    const theme = useTheme();
    const [svg, setSvg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const mermaid = await getMermaid();
            const renderId = `mermaid-${id.replace(/:/g, "")}`;
            const themed = `%%{init: { 'theme': '${theme}' } }%%\n${chart}`;
            const { svg } = await mermaid.render(renderId, themed);
            if (!cancelled) setSvg(svg);
        })().catch((err) => {
            if (!cancelled) {
                console.error("Mermaid render failed:", err);
                setSvg(null);
            }
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
