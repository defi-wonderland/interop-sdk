// Probes which token pair returns quotes from all providers.
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

const CHAIN_IDS = [1, 8453, 42161, 10];
const SYMBOLS = ['USDC', 'WETH'];
const CHAIN_NAMES = { 1: 'ethereum', 8453: 'base', 42161: 'arbitrum', 10: 'optimism' };
const EXPECTED_PROVIDERS = ['across', 'relay', 'lifi-intents', 'bungee'];

const discovered = await aggregator.discoverAssets({ chainIds: CHAIN_IDS });

function findAsset(chainId, symbol) {
  const addrs = discovered.tokensByChain?.[chainId] ?? [];
  const meta = discovered.tokenMetadata?.[chainId] ?? {};
  for (const a of addrs) {
    const m = meta[a.toLowerCase()];
    if (m?.symbol === symbol) return { address: a, decimals: m.decimals };
  }
  return null;
}

function buildAmount(decimals, units) {
  return (BigInt(units) * 10n ** BigInt(decimals)).toString();
}

const TEST_PAIRS = [];
for (const symbol of SYMBOLS) {
  for (const from of CHAIN_IDS) {
    for (const to of CHAIN_IDS) {
      if (from === to) continue;
      TEST_PAIRS.push({ symbol, from, to });
    }
  }
}

const matrix = [];

for (const { symbol, from, to } of TEST_PAIRS) {
  const inAsset = findAsset(from, symbol);
  const outAsset = findAsset(to, symbol);
  if (!inAsset || !outAsset) continue;

  const request = {
    user: USER_PLACEHOLDER,
    input: { chainId: from, assetAddress: inAsset.address, amount: buildAmount(inAsset.decimals, '1000') },
    output: { chainId: to, assetAddress: outAsset.address, recipient: USER_PLACEHOLDER },
    swapType: 'exact-input',
  };

  try {
    const res = await aggregator.getQuotes(request);
    const seen = new Set(res.quotes.map((q) => q._providerId));
    const errored = new Set(res.errors.map((e) => e.providerId).filter(Boolean));
    matrix.push({
      symbol,
      from,
      to,
      providers: Object.fromEntries(EXPECTED_PROVIDERS.map((id) => [id, seen.has(id) ? 'OK' : errored.has(id) ? 'ERR' : 'skip'])),
    });
  } catch (error) {
    matrix.push({ symbol, from, to, providers: { error: error?.message ?? String(error) } });
  }
}

console.log('\nProvider coverage matrix (OK = quote, ERR = explicit error, skip = silent drop):\n');
console.log(`${'symbol'.padEnd(6)} ${'from'.padEnd(10)} ${'to'.padEnd(10)} ${EXPECTED_PROVIDERS.map((p) => p.padEnd(14)).join(' ')}`);
for (const row of matrix) {
  console.log(
    `${row.symbol.padEnd(6)} ${(CHAIN_NAMES[row.from] ?? row.from).padEnd(10)} ${(CHAIN_NAMES[row.to] ?? row.to).padEnd(10)} ${EXPECTED_PROVIDERS.map((p) => (row.providers[p] ?? '?').padEnd(14)).join(' ')}`,
  );
}

const fullCoverage = matrix.filter((row) => EXPECTED_PROVIDERS.every((p) => row.providers[p] === 'OK'));
console.log(`\nPairs covered by ALL 4 providers (${fullCoverage.length}):`);
fullCoverage.forEach((r) => console.log(`  ${r.symbol} ${CHAIN_NAMES[r.from]} -> ${CHAIN_NAMES[r.to]}`));

const threeCoverage = matrix.filter((row) => EXPECTED_PROVIDERS.filter((p) => row.providers[p] === 'OK').length >= 3);
console.log(`\nPairs covered by >=3 providers (${threeCoverage.length}):`);
threeCoverage.forEach((r) => {
  const covered = EXPECTED_PROVIDERS.filter((p) => r.providers[p] === 'OK').join(', ');
  console.log(`  ${r.symbol} ${CHAIN_NAMES[r.from]} -> ${CHAIN_NAMES[r.to]}: ${covered}`);
});
