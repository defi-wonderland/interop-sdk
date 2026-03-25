import { CrossChainClient } from './CrossChainClient';
import { Providers } from './providers';

export default function CrossChainPage() {
  return (
    <Providers>
      <CrossChainClient />
    </Providers>
  );
}
