import * as fs from "fs";
import * as path from "path";

const SITE_URL = "https://docs.interop.wonderland.xyz";
// Script is always run from the apps/docs directory via package.json
const DOCS_DIR = path.resolve(process.cwd(), "docs");
const STATIC_DIR = path.resolve(process.cwd(), "static");

/** Ordered list of all doc page IDs, mirroring sidebars.ts */
const PAGE_IDS: string[] = [
    "about",
    "installation",
    "addresses",
    "addresses/getting-started",
    "addresses/concepts",
    "addresses/example",
    "addresses/advanced-usage",
    "addresses/api",
    "cross-chain",
    "cross-chain/getting-started",
    "cross-chain/concepts",
    "cross-chain/flow",
    "cross-chain/providers",
    "cross-chain/across-provider",
    "cross-chain/relay-provider",
    "cross-chain/oif-provider",
    "cross-chain/bungee-provider",
    "cross-chain/example",
    "cross-chain/frontend-integration",
    "cross-chain/intent-tracking",
    "cross-chain/advanced-usage",
    "cross-chain/api",
];

interface PageInfo {
    id: string;
    title: string;
    url: string;
    content: string;
}

/** Extract the title from frontmatter or first heading. */
function extractTitle(content: string, id: string): string {
    const frontmatterMatch = content.match(/^---[\s\S]*?^title:\s*(.+)$/m);
    if (frontmatterMatch) {
        return frontmatterMatch[1].trim();
    }
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
        return headingMatch[1].trim();
    }
    // Fallback: derive from ID
    const segment = id.split("/").pop() ?? id;
    return segment
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/** Strip frontmatter block from markdown. */
function stripFrontmatter(content: string): string {
    return content.replace(/^---[\s\S]*?---\n?/, "").trimStart();
}

/** Extract the first non-empty sentence or line as a one-line description. */
function extractDescription(content: string): string {
    const body = stripFrontmatter(content);
    for (const line of body.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
            // Truncate to ~120 chars
            return trimmed.length > 120 ? trimmed.slice(0, 117) + "..." : trimmed;
        }
    }
    return "";
}

function readPage(id: string): PageInfo | null {
    const filePath = path.join(DOCS_DIR, `${id}.md`);
    if (!fs.existsSync(filePath)) {
        console.warn(`Skipping missing page: ${id}`);
        return null;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const title = extractTitle(content, id);
    const url = `${SITE_URL}/${id}`;
    return { id, title, url, content };
}

function generateFullCorpus(pages: PageInfo[]): string {
    const sections = pages.map((page) => {
        const body = stripFrontmatter(page.content);
        return `# Page: ${page.title}\n# URL: ${page.url}\n\n${body}\n\n---`;
    });
    return sections.join("\n\n") + "\n";
}

function formatEntry(page: PageInfo): string {
    const desc = extractDescription(page.content);
    return desc ? `${page.title}: ${page.url} — ${desc}` : `${page.title}: ${page.url}`;
}

function generateIndex(pages: PageInfo[]): string {
    const lines: string[] = [
        "# Interop SDK — Documentation",
        `# Full corpus: ${SITE_URL}/llms-full.txt`,
        "",
    ];

    const topLevel: PageInfo[] = [];
    const addressPages: PageInfo[] = [];
    const crossChainPages: PageInfo[] = [];

    for (const page of pages) {
        if (page.id.startsWith("addresses/")) {
            addressPages.push(page);
        } else if (page.id.startsWith("cross-chain/")) {
            crossChainPages.push(page);
        } else {
            topLevel.push(page);
        }
    }

    lines.push("## General");
    for (const page of topLevel) {
        lines.push(`- ${formatEntry(page)}`);
    }
    lines.push("");

    const addressesRoot = topLevel.find((p) => p.id === "addresses");
    lines.push("## Addresses");
    if (addressesRoot) {
        const desc = extractDescription(addressesRoot.content);
        if (desc) lines.push(`> ${desc}`);
    }
    for (const page of addressPages) {
        lines.push(`- ${formatEntry(page)}`);
    }
    lines.push("");

    const crossChainRoot = topLevel.find((p) => p.id === "cross-chain");
    lines.push("## Cross-Chain");
    if (crossChainRoot) {
        const desc = extractDescription(crossChainRoot.content);
        if (desc) lines.push(`> ${desc}`);
    }
    for (const page of crossChainPages) {
        lines.push(`- ${formatEntry(page)}`);
    }
    lines.push("");

    return lines.join("\n");
}

function main(): void {
    const pages = PAGE_IDS.map(readPage).filter((p): p is PageInfo => p !== null);

    const fullCorpus = generateFullCorpus(pages);
    const index = generateIndex(pages);

    fs.mkdirSync(STATIC_DIR, { recursive: true });

    fs.writeFileSync(path.join(STATIC_DIR, "llms-full.txt"), fullCorpus, "utf-8");
    fs.writeFileSync(path.join(STATIC_DIR, "llms.txt"), index, "utf-8");

    console.log(`Written static/llms-full.txt (${fullCorpus.length} bytes)`);
    console.log(`Written static/llms.txt (${index.length} bytes)`);
}

main();
