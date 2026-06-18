import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cross-Chain Bridge Benchmark',
    short_name: 'Bridge Benchmark',
    description:
      'Live benchmark racing cross-chain intent providers — Across, Relay, LiFi, Bungee — on quote speed, fee percentage, and fill success rate across routes.',
    start_url: '/',
    display: 'standalone',
    background_color: '#dee3eb',
    theme_color: '#1a3a5c',
    icons: [
      { src: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/favicon.ico', type: 'image/x-icon', sizes: '64x64' },
    ],
  };
}
