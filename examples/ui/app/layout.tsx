import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { WalletProvider } from './providers/WalletProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Interop SDK Demo',
  description: 'Interactive showcase of Interop SDK features',
  keywords: [
    'Ethereum',
    'ERC-7930',
    'ERC-7828',
    'ERC-7683',
    'interoperability',
    'cross-chain',
    'blockchain',
    'addresses',
    'intents',
  ],
  authors: [{ name: 'Wonderland', url: 'https://wonderland.xyz' }],
  openGraph: {
    title: 'Interop SDK Demo',
    description:
      'Interactive showcase of Interop SDK features. Explore cross-chain addresses (ERC-7930) and cross-chain intents (ERC-7683).',
    type: 'website',
    url: 'https://interop.wonderland.xyz',
    siteName: 'Interop SDK Demo',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Interop SDK Demo - Wonderland',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Interop SDK Demo',
    description: 'Interactive showcase of Interop SDK features. Explore cross-chain addresses and intents.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' data-theme='dark'>
      <head>
        <link rel='icon' href='/favicon.svg' type='image/svg+xml' sizes='any' />
        <link rel='icon' href='/favicon.ico' sizes='64x64' />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Suspense>
          <WalletProvider>{children}</WalletProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
