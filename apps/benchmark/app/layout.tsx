import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const SITE_URL = 'https://benchmark.interop.wonderland.xyz';

const DESCRIPTION =
  'Live benchmark racing cross-chain intent providers — Across, Relay, LiFi, Bungee — on quote speed, fee percentage, and fill success rate across routes.';

const SOCIAL_DESCRIPTION =
  'Watch Across, Relay, LiFi and Bungee compete on speed, fees, and success rate. A live cross-chain quote race.';

const SITE_NAME = 'Cross-Chain Bridge Benchmark';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Cross-Chain Bridge Benchmark — Across vs Relay vs LiFi vs Bungee | Wonderland',
    template: '%s | Cross-Chain Benchmark',
  },
  description: DESCRIPTION,
  keywords: [
    'cross-chain',
    'bridge benchmark',
    'cross-chain intents',
    'ERC-7683',
    'Across',
    'Relay',
    'LiFi',
    'Bungee',
    'bridge fees',
    'quote latency',
    'fill success rate',
    'intent solvers',
    'DeFi interoperability',
  ],
  authors: [{ name: 'Wonderland', url: 'https://wonderland.xyz' }],
  creator: 'Wonderland',
  publisher: 'Wonderland',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '64x64' },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: '/',
    title: 'Cross-Chain Bridge Benchmark — Across vs Relay vs LiFi vs Bungee | Wonderland',
    description: SOCIAL_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cross-Chain Bridge Benchmark — Across vs Relay vs LiFi vs Bungee | Wonderland',
    description: SOCIAL_DESCRIPTION,
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  publisher: {
    '@type': 'Organization',
    name: 'Wonderland',
    url: 'https://wonderland.xyz',
  },
};

const webApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  description: DESCRIPTION,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Organization',
    name: 'Wonderland',
    url: 'https://wonderland.xyz',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Wonderland',
    url: 'https://wonderland.xyz',
  },
  featureList: [
    'Live cross-chain quote race',
    'Provider leaderboard',
    'Head-to-head route comparison',
    'Quote latency tracking',
    'Bridge fee comparison',
    'Fill success rate metrics',
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script type='application/ld+json'>{JSON.stringify(websiteJsonLd)}</script>
        <script type='application/ld+json'>{JSON.stringify(webApplicationJsonLd)}</script>
        {children}
      </body>
    </html>
  );
}
