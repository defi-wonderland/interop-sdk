'use client';

import { createContext, useContext, type ReactNode } from 'react';

const TESTNET_QUERY_PARAM = 'testnet';

interface NetworkContextValue {
  isTestnet: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ isTestnet: false });

interface NetworkProviderProps {
  children: ReactNode;
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * Provider that makes network configuration available to all child components
 * Reads from searchParams passed from the server
 */
export function NetworkProvider({ children, searchParams }: NetworkProviderProps) {
  const isTestnet = searchParams[TESTNET_QUERY_PARAM] === 'true';

  return <NetworkContext.Provider value={{ isTestnet }}>{children}</NetworkContext.Provider>;
}

/**
 * Hook to get the current network selection
 */
export function useIsTestnet(): boolean {
  const context = useContext(NetworkContext);
  return context.isTestnet;
}

/**
 * Set the network selection by updating URL and reloading
 * @param isTestnet - true for testnet, false for mainnet
 */
export function setNetworkAndReload(isTestnet: boolean): void {
  const url = new URL(window.location.href);
  if (isTestnet) {
    url.searchParams.set(TESTNET_QUERY_PARAM, 'true');
  } else {
    url.searchParams.delete(TESTNET_QUERY_PARAM);
  }
  window.location.href = url.toString();
}
