'use client';

import { useState } from 'react';
import { Arrow } from '../Arrow';
import { InlinePicker, type InlinePickerOption } from './InlinePicker';
import { CHAIN_IDS, CHAINS, type ChainId } from '~/lib/chains';
import { useHeadToHeadRouteStore } from '~/lib/headToHeadRouteStore';

// Widest chain displayName is 8 characters (arbitrum/ethereum/optimism). A
// fixed label width keeps both chain chips the same size, so the swap arrow
// between them doesn't shift when e.g. `base` moves to the front.
const CHAIN_LABEL_CLASS = 'min-w-[8ch] text-center';

export function RouteSelector() {
  const route = useHeadToHeadRouteStore((state) => state.route);
  const setFromChainId = useHeadToHeadRouteStore((state) => state.setFromChainId);
  const setToChainId = useHeadToHeadRouteStore((state) => state.setToChainId);
  const swapChains = useHeadToHeadRouteStore((state) => state.swapChains);
  const [swapSpins, setSwapSpins] = useState(0);

  const handleSwap = () => {
    swapChains();
    setSwapSpins((count) => count + 1);
  };

  const from = CHAINS[route.fromChainId];
  const to = CHAINS[route.toChainId];

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
    <div className='flex items-center gap-2.5 font-mono text-mark text-text-primary'>
      <span className='font-mono text-label uppercase tracking-wider text-text-muted'>ROUTE</span>
      <InlinePicker
        ariaLabel='route from chain'
        value={route.fromChainId}
        options={fromChainOptions}
        onChange={setFromChainId}
        triggerDotClass={from.colorClass}
        triggerLabel={from.displayName}
        triggerLabelClassName={CHAIN_LABEL_CLASS}
      />
      <Arrow onSwap={handleSwap} spinKey={swapSpins} ariaLabel='swap chains' />
      <InlinePicker
        ariaLabel='route to chain'
        value={route.toChainId}
        options={toChainOptions}
        onChange={setToChainId}
        triggerDotClass={to.colorClass}
        triggerLabel={to.displayName}
        triggerLabelClassName={CHAIN_LABEL_CLASS}
      />
    </div>
  );
}
