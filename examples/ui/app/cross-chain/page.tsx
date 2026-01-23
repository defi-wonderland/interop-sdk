import { CrossChainClient } from './CrossChainClient';
import { Providers } from './providers';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CrossChainPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isTestnet = params.testnet === 'true';

  return (
    <Providers isTestnet={isTestnet}>
      <CrossChainClient />
    </Providers>
  );
}
