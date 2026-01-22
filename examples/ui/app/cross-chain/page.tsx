import { CrossChainClient } from './CrossChainClient';
import { NetworkProvider } from './config/NetworkContext';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CrossChainPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <NetworkProvider searchParams={params}>
      <CrossChainClient />
    </NetworkProvider>
  );
}
