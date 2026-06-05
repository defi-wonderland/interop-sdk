import { ASSETS, AssetSymbol } from './assets';
import { ChainId } from './chains';

export const INITIAL_FROM_CHAIN_ID = ChainId.Arbitrum;
export const INITIAL_TO_CHAIN_ID = ChainId.Base;
export const INITIAL_ASSET_SYMBOL = AssetSymbol.USDC;

// Derived from the initial asset's first preset so the boot state always
// matches a real preset of the selected asset.
const initialPreset = ASSETS[INITIAL_ASSET_SYMBOL].presets[0];
export const INITIAL_AMOUNT = initialPreset.amount;
export const INITIAL_PRESET = initialPreset.label;
