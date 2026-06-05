'use client';

import { InlinePicker, type InlinePickerOption } from './InlinePicker';
import { ASSET_SYMBOLS, ASSETS, type AssetSymbol } from '~/lib/assets';
import { CHAIN_IDS, CHAINS, type ChainId } from '~/lib/chains';
import { useHeadToHeadRouteStore } from '~/lib/headToHeadRouteStore';

export function RouteSelector() {
  const route = useHeadToHeadRouteStore((state) => state.route);
  const setFromChainId = useHeadToHeadRouteStore((state) => state.setFromChainId);
  const setToChainId = useHeadToHeadRouteStore((state) => state.setToChainId);
  const setAssetSymbol = useHeadToHeadRouteStore((state) => state.setAssetSymbol);
  const swapChains = useHeadToHeadRouteStore((state) => state.swapChains);

  const from = CHAINS[route.fromChainId];
  const to = CHAINS[route.toChainId];
  const asset = ASSETS[route.assetSymbol];

  const assetOptions: InlinePickerOption<AssetSymbol>[] = ASSET_SYMBOLS.map((symbol) => ({
    value: symbol,
    label: ASSETS[symbol].displayName,
    dotClass: ASSETS[symbol].colorClass,
  }));
  const fromChainOptions: InlinePickerOption<ChainId>[] = CHAIN_IDS.filter((id) => id !== route.toChainId).map(
    (id) => ({
      value: id,
      label: CHAINS[id].displayName,
      dotClass: CHAINS[id].colorClass,
    }),
  );
  const toChainOptions: InlinePickerOption<ChainId>[] = CHAIN_IDS.filter((id) => id !== route.fromChainId).map(
    (id) => ({
      value: id,
      label: CHAINS[id].displayName,
      dotClass: CHAINS[id].colorClass,
    }),
  );

  return (
    <div className='flex items-center gap-3.5 border border-border bg-surface-elevated px-4 py-2.5'>
      <span className='font-mono text-label uppercase tracking-wider text-text-muted'>ROUTE</span>
      <div className='flex items-center gap-2 font-mono text-mark text-text-primary'>
        <InlinePicker
          ariaLabel='route asset'
          value={route.assetSymbol}
          options={assetOptions}
          onChange={setAssetSymbol}
          triggerDotClass={asset.colorClass}
          triggerLabel={asset.displayName}
        />
        <span className='text-text-muted'>·</span>
        <InlinePicker
          ariaLabel='route from chain'
          value={route.fromChainId}
          options={fromChainOptions}
          onChange={setFromChainId}
          triggerDotClass={from.colorClass}
          triggerLabel={from.displayName}
        />
        <button
          type='button'
          onClick={swapChains}
          aria-label='swap chains'
          className='cursor-pointer text-text-muted transition hover:text-text-primary active:scale-95'
        >
          →
        </button>
        <InlinePicker
          ariaLabel='route to chain'
          value={route.toChainId}
          options={toChainOptions}
          onChange={setToChainId}
          triggerDotClass={to.colorClass}
          triggerLabel={to.displayName}
        />
      </div>
    </div>
  );
}
