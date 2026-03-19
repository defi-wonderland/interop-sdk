import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "next-themes";

import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";

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
    metadataBase: new URL("https://openintents.xyz"),
    title: "Open Intents | Cross-chain UX for Ethereum",
    description:
        "An ecosystem-wide initiative focused on improving the cross-chain user experience on Ethereum while maintaining freedom and minimising trust.",
    keywords: [
        "Ethereum",
        "cross-chain",
        "interoperability",
        "intents",
        "ERC-7683",
        "ERC-7930",
        "ERC-7828",
        "Open Intents Framework",
        "OIF",
    ],
    authors: [{ name: "Open Intents", url: "https://openintents.xyz" }],
    openGraph: {
        title: "Open Intents | Cross-chain UX for Ethereum",
        description:
            "An ecosystem-wide initiative focused on improving the cross-chain user experience on Ethereum while maintaining freedom and minimising trust.",
        type: "website",
        url: "https://openintents.xyz",
        siteName: "Open Intents",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "Open Intents - Cross-chain UX for Ethereum",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Open Intents | Cross-chain UX for Ethereum",
        description:
            "An ecosystem-wide initiative focused on improving the cross-chain user experience on Ethereum while maintaining freedom and minimising trust.",
        images: ["/og-image.png"],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${geist.variable} ${geistMono.variable}`}
            suppressHydrationWarning
        >
            <body className="font-mono antialiased">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <TooltipProvider>{children}</TooltipProvider>
                </ThemeProvider>
                <Analytics />
            </body>
        </html>
    );
}
