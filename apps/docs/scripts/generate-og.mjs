// Pre-renders one Open Graph card per docs page into public/og/ and writes the
// route -> image map to og.generated.ts (imported by vocs.config.ts).
//
// The generated PNGs and og.generated.ts are committed, so the regular build
// needs no extra dependencies. To regenerate after editing pages, install the
// render-only tools and run this script from the repo root:
//
//   pnpm --filter docs add -D satori @resvg/resvg-js @fontsource/inter
//   node apps/docs/scripts/generate-og.mjs
//   git restore apps/docs/package.json pnpm-lock.yaml   # keep deps out of the lockfile
//
// They're kept out of package.json on purpose: this repo's lockfile re-resolves
// thousands of unrelated lines on any install, so we avoid coupling that churn
// to a docs asset.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(here, "..");
const pagesDir = join(docsRoot, "pages");
const publicDir = join(docsRoot, "public");
const outDir = join(publicDir, "og");

const fontRegular = readFileSync(
  require.resolve("@fontsource/inter/files/inter-latin-400-normal.woff"),
);
const fontBold = readFileSync(
  require.resolve("@fontsource/inter/files/inter-latin-700-normal.woff"),
);
const logo =
  "data:image/png;base64," +
  readFileSync(join(publicDir, "wonderland-white.png")).toString("base64");

// Fallbacks when a page omits frontmatter.
const SITE_TITLE = "Interop SDK";
const SITE_DESCRIPTION =
  "Build multichain applications with interoperable addresses and cross-chain transfer tooling.";

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith(".mdx")) files.push(full);
  }
  return files;
}

function routeFor(file) {
  const route = ("/" + relative(pagesDir, file).replace(/\\/g, "/").replace(/\.mdx$/, ""))
    .replace(/\/index$/, "");
  return route === "" ? "/" : route;
}

function slugFor(route) {
  return route === "/" ? "index" : route.slice(1).replace(/\//g, "-");
}

function parseFrontmatter(src) {
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const data = {};
  if (!match) return data;
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key) data[key] = value;
  }
  return data;
}

function clamp(text, max) {
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "...";
}

function card(title, description) {
  return {
    type: "div",
    props: {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        backgroundColor: "#161616",
        color: "#ffffff",
        fontFamily: "Inter",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex" },
            children: [{ type: "img", props: { src: logo, style: { height: 52 } } }],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: 64,
                    height: 6,
                    backgroundColor: "#7f8cff",
                    borderRadius: 3,
                    marginBottom: 28,
                    display: "flex",
                  },
                },
              },
              {
                type: "div",
                props: {
                  style: { fontSize: 64, fontWeight: 700, letterSpacing: -1, lineHeight: 1.1 },
                  children: clamp(title, 60),
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 30,
                    fontWeight: 400,
                    color: "rgba(255,255,255,0.6)",
                    marginTop: 20,
                    maxWidth: 1000,
                    lineHeight: 1.4,
                  },
                  children: clamp(description, 160),
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function render(title, description) {
  const svg = await satori(card(title, description), {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
      { name: "Inter", data: fontBold, weight: 700, style: "normal" },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}

mkdirSync(outDir, { recursive: true });

const map = {};
for (const file of walk(pagesDir).sort()) {
  const route = routeFor(file);
  const slug = slugFor(route);
  const fm = parseFrontmatter(readFileSync(file, "utf8"));
  const png = await render(fm.title || SITE_TITLE, fm.description || SITE_DESCRIPTION);
  writeFileSync(join(outDir, `${slug}.png`), png);
  map[route] = `/og/${slug}.png`;
}

// Vocs matches the longest path key, so emit shortest paths first.
const ordered = Object.keys(map).sort((a, b) => a.length - b.length || a.localeCompare(b));
const entries = ordered.map((route) => `    "${route}": "${map[route]}",`).join("\n");
const module = `// Generated by scripts/generate-og.mjs — do not edit by hand.
// Maps each route to its pre-rendered Open Graph image.
export const ogImages: Record<string, string> = {
${entries}
};
`;
writeFileSync(join(docsRoot, "og.generated.ts"), module);

console.log(`Generated ${ordered.length} OG images into ${relative(docsRoot, outDir)}/`);
