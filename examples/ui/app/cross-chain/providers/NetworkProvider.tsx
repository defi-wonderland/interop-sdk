'use client';

import { createContext, useContext, type ReactNode } from 'react';

const TESTNET_QUERY_PARAM = 'testnet';

interface NetworkContextValue {
  isTestnet: boolean;
}

export const NetworkContext = createContext<NetworkContextValue>({ isTestnet: false });

interface NetworkProviderProps {
  children: ReactNode;
  isTestnet: boolean;
}

/**
 * Provider that makes network configuration available to all child components
 */
export function NetworkProvider({ children, isTestnet }: NetworkProviderProps) {
  return <NetworkContext.Provider value={{ isTestnet }}>{children}</NetworkContext.Provider>;
}

/**
 * Hook to get the current network selection (for React components)
 */
export function useIsTestnet(): boolean {
  const context = useContext(NetworkContext);
  return context.isTestnet;
}

/**
 * Get the current network selection from URL (for non-React code)
 */
export function getIsTestnet(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get(TESTNET_QUERY_PARAM) === 'true';
}

/**
 * Set the network selection by updating URL and reloading
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
