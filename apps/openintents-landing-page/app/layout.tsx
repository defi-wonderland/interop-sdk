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

const META_TITLE = "Open Intents | Cross-chain UX for Ethereum";
const META_DESCRIPTION =
    "An ecosystem-wide initiative focused on improving the cross-chain user experience on Ethereum while maintaining freedom and minimising trust.";

const getMetadataBase = (): URL => {
    const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (prodUrl) {
        try {
            return new URL(`https://${prodUrl}`);
        } catch {
            // Fall through to default
        }
    }
    return new URL("https://openintents.xyz");
};

export const metadata: Metadata = {
    metadataBase: getMetadataBase(),
    title: META_TITLE,
    description: META_DESCRIPTION,
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
        title: META_TITLE,
        description: META_DESCRIPTION,
        type: "website",
        url: "https://openintents.xyz",
        siteName: "Open Intents",
    },
    twitter: {
        card: "summary_large_image",
        title: META_TITLE,
        description: META_DESCRIPTION,
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
