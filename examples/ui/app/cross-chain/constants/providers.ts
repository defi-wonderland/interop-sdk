import { PROTOCOLS, type SupportedProtocols, type SupportedProtocolsConfigs } from '@wonderland/interop-cross-chain';

export interface ProviderConfig {
  id: SupportedProtocols;
  displayName: string;
  config: SupportedProtocolsConfigs<SupportedProtocols>;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: PROTOCOLS.ACROSS,
    displayName: 'Across Protocol',
    config: {
      apiUrl: process.env.NEXT_PUBLIC_ACROSS_API_URL || 'https://testnet.across.to/api',
      providerId: 'across',
    },
  },
];

/**
 * Gets the display name for a provider by its ID
 * @param providerId - The provider identifier
 * @returns The display name or the provider ID if not found
 */
export function getProviderDisplayName(providerId: string): string {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  return provider?.displayName || providerId;
}
