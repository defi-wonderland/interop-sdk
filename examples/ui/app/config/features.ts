/**
 * Apps are enabled by default. To disable, add to NEXT_PUBLIC_DISABLED_APPS (comma-separated).
 * Example: NEXT_PUBLIC_DISABLED_APPS=addresses,cross-chain
 */

export const APPS = [
  {
    id: 'addresses',
    href: '/addresses',
    label: 'Addresses',
    badge: 'ERC-7930 & ERC-7828',
    title: 'Interoperable Addresses',
    description: 'Learn how cross-chain addresses work across different formats',
  },
  {
    id: 'cross-chain',
    href: '/cross-chain',
    label: 'Cross-Chain',
    badge: 'EIP-7683 & Intents',
    title: 'Cross-Chain Intent Swap',
    description: 'Experience seamless cross-chain transfers with intent-based routing',
  },
] as const;

export function getEnabledApps() {
  const disabled = (process.env.NEXT_PUBLIC_DISABLED_APPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return APPS.filter((app) => !disabled.includes(app.id));
}
