// Reproduces what useRunRace does on the client: discover chains, build a Base USDC -> Arb USDC 1k request, call getQuotes.
// Run with: node scripts/debug-getquotes.mjs from apps/benchmark (after SDK packages are built).

import {
  createAggregator,
  createCrossChainProvider,
  LIFI_INTENTS_ORDER_SERVER_URL,
  PROTOCOLS,
} from '@wonderland/interop-cross-chain';

const USER_PLACEHOLDER = '0x000000000000000000000000000000000000dEaD';

const aggregator = createAggregator({
  providers: [
    createCrossChainProvider(PROTOCOLS.ACROSS, { providerId: 'across' }),
    createCrossChainProvider(PROTOCOLS.OIF, {
      providerId: 'oif',
      solverId: 'mainnet-solver',
      url: 'https://oif-api.openzeppelin.com/api',
    }),
    createCrossChainProvider(PROTOCOLS.LIFI_INTENTS, {
      providerId: 'lifi-intents',
      orderServerUrl: LIFI_INTENTS_ORDER_SERVER_URL,
    }),
    createCrossChainProvider(PROTOCOLS.RELAY, { providerId: 'relay' }),
    createCrossChainProvider(PROTOCOLS.BUNGEE, { providerId: 'bungee' }),
  ],
});

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

logSection('Chain discovery');
const discoverStart = Date.now();
let discovered;
try {
  discovered = await aggregator.discoverAssets({ chainIds: [1, 8453, 42161, 10] });
  console.log(`Discovered in ${Date.now() - discoverStart}ms`);
} catch (error) {
  console.log(`Chain discovery failed in ${Date.now() - discoverStart}ms:`, error?.message ?? error);
  process.exit(1);
}

function findUsdc(chainId) {
  const addrs = discovered.tokensByChain?.[chainId] ?? [];
  const meta = discovered.tokenMetadata?.[chainId] ?? {};
  for (const a of addrs) {
    const m = meta[a.toLowerCase()];
    if (m?.symbol === 'USDC') return { address: a, decimals: m.decimals };
  }
  return null;
}

const baseUsdc = findUsdc(8453);
const arbUsdc = findUsdc(42161);
console.log('Base USDC:', baseUsdc, '| Arb USDC:', arbUsdc);
if (!baseUsdc || !arbUsdc) {
  console.log('No USDC found; aborting.');
  process.exit(1);
}

const amount = (BigInt('1000') * 10n ** BigInt(baseUsdc.decimals)).toString();

const request = {
  user: USER_PLACEHOLDER,
  input: { chainId: 8453, assetAddress: baseUsdc.address, amount },
  output: { chainId: 42161, assetAddress: arbUsdc.address, recipient: USER_PLACEHOLDER },
  swapType: 'exact-input',
};

for (let run = 1; run <= 3; run += 1) {
  logSection(`getQuotes — run ${run}`);
  const start = Date.now();
  try {
    const res = await aggregator.getQuotes(request);
    console.log(`Finished in ${Date.now() - start}ms`);
    console.log(`Quotes (${res.quotes.length}):`);
    for (const q of res.quotes) {
      console.log(
        `  - ${q._providerId} | ${q.latencyMs}ms | output ${q.preview?.outputs?.[0]?.amount} | eta ${q.eta}`,
      );
    }
    console.log(`Errors (${res.errors.length}):`);
    for (const e of res.errors) {
      console.log(`  - ${e.errorMsg} (${e.latencyMs}ms)`);
    }
  } catch (error) {
    console.log(`Failed in ${Date.now() - start}ms:`, error?.message ?? error);
  }
}
