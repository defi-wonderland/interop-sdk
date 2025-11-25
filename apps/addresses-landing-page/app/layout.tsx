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
    title: "Interoperable Addresses",
    description: "Chain-aware addressing for the Ethereum ecosystem. ERC-7930 & ERC-7828",
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
