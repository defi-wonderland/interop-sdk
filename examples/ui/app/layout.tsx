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
        <WalletProvider>{children}</WalletProvider>
        <Analytics />
      </body>
    </html>
  );
}
