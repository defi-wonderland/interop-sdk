import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";

// Initialize fonts
const geist = Geist({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Interoperable Addresses | ERC-7930 & ERC-7828",
    description: "Chain-aware addressing for the Ethereum ecosystem. ERC-7930 & ERC-7828",
    keywords: [
        "Ethereum",
        "ERC-7930",
        "ERC-7828",
        "interoperability",
        "cross-chain",
        "blockchain",
        "addresses",
        "ENS",
        "chain-aware",
    ],
    authors: [{ name: "Wonderland", url: "https://wonderland.xyz" }],
    openGraph: {
        title: "Interoperable Addresses | ERC-7930 & ERC-7828",
        description:
            "Chain-aware addressing for the Ethereum ecosystem. Simplify interoperability and eliminate cross-chain mistakes with human-readable addresses that include chain information.",
        type: "website",
        url: "https://interop-addresses.xyz",
        siteName: "Interoperable Addresses",
        images: [
            {
                url: "/share.jpg",
                width: 1200,
                height: 630,
                alt: "Wonderland - Interoperable Addresses",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Interoperable Addresses | ERC-7930 & ERC-7828",
        description: "Chain-aware addressing for the Ethereum ecosystem. ERC-7930 & ERC-7828",
        images: ["/share.jpg"],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
            <body className="font-mono antialiased">
                {children}
                <Analytics />
            </body>
        </html>
    );
}
