/**
 * WORKAROUND: OIF solver API never transitions to Finalized.
 * Verifies the fill tx receipt on-chain and promotes TRACKING → DONE.
 * Remove this file once the solver is fixed.
 */
import { useEffect, useState } from 'react';
import { OrderStatus } from '@wonderland/interop-cross-chain';
import { getAddress, toEventHash } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import type { Address, Hex, PublicClient } from 'viem';
import { BridgeState, STEP } from '~/cross-chain/hooks';

const TRANSFER_TOPIC = toEventHash('event Transfer(address indexed from, address indexed to, uint256 value)');

const POLL_INTERVAL_MS = 5_000; // 5 seconds

/**
 * Fetches the fill tx receipt and calls onVerified if it contains a
 * successful Transfer to the recipient. Silently swallows errors (tx pending, RPC down).
 */
function verifyFill(publicClient: PublicClient, fillTxHash: Hex, recipient: Address, onVerified: () => void): void {
  publicClient
    .getTransactionReceipt({ hash: fillTxHash })
    .then((receipt) => {
      if (receipt.status !== 'success') return;
      const filled = receipt.logs.some(
        (log) =>
          log.topics[0] === TRANSFER_TOPIC &&
          log.topics[2] &&
          getAddress(('0x' + log.topics[2].slice(26)) as Address) === getAddress(recipient),
      );
      if (filled) onVerified();
    })
    .catch(() => {
      console.error(`Failed to get transaction receipt for fill tx ${fillTxHash}`);
    });
}

export function useFillWorkaround(state: BridgeState, abortTracking: () => void): BridgeState {
  const chainId = state.step === STEP.TRACKING ? state.destinationChainId : undefined;
  const publicClient = usePublicClient({ chainId });
  const { address: recipient } = useAccount();
  const [verifiedTxHash, setVerifiedTxHash] = useState<Hex | null>(null);

  const fillTxHash = state.step === STEP.TRACKING ? state.update.fillTxHash : undefined;

  useEffect(() => {
    if (!fillTxHash || !publicClient || !recipient) return;

    let active = true;
    const onVerified = () => {
      if (!active) return;
      setVerifiedTxHash(fillTxHash);
      abortTracking();
    };

    verifyFill(publicClient, fillTxHash, recipient, onVerified);
    const interval = setInterval(() => verifyFill(publicClient, fillTxHash, recipient, onVerified), POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fillTxHash, publicClient, recipient, abortTracking]);

  if (verifiedTxHash && state.step === STEP.TRACKING && state.update.fillTxHash === verifiedTxHash) {
    return {
      step: STEP.DONE,
      update: { ...state.update, status: OrderStatus.Finalized },
      originChainId: state.originChainId,
      destinationChainId: state.destinationChainId,
    };
  }

  return state;
}
