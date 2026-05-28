export enum ProviderId {
  Across = 'across',
  Relay = 'relay',
  Lifi = 'lifi-intents',
  Bungee = 'bungee',
}

export interface ProviderMeta {
  id: ProviderId;
  displayName: string;
  colorClass: string;
  iconUrl: string;
  hasGlobalFeed: boolean;
  noFeedReason?: string;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  [ProviderId.Across]: {
    id: ProviderId.Across,
    displayName: 'across',
    colorClass: 'bg-provider-across',
    iconUrl: '/icons/providers/across.svg',
    hasGlobalFeed: true,
  },
  [ProviderId.Relay]: {
    id: ProviderId.Relay,
    displayName: 'relay',
    colorClass: 'bg-provider-relay',
    iconUrl: '/icons/providers/relay.svg',
    hasGlobalFeed: true,
  },
  [ProviderId.Lifi]: {
    id: ProviderId.Lifi,
    displayName: 'lifi-intents',
    colorClass: 'bg-provider-lifi',
    iconUrl: '/icons/providers/lifi.svg',
    hasGlobalFeed: true,
  },
  [ProviderId.Bungee]: {
    id: ProviderId.Bungee,
    displayName: 'bungee',
    colorClass: 'bg-provider-bungee',
    iconUrl: '/icons/providers/bungee.webp',
    hasGlobalFeed: false,
    noFeedReason: 'no global feed',
  },
};

export const PROVIDER_IDS: readonly ProviderId[] = Object.values(ProviderId);
