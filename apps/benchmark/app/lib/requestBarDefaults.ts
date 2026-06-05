import { ASSETS, AssetSymbol } from './assets';
import { ChainId } from './chains';

export const INITIAL_FROM_CHAIN_ID = ChainId.Arbitrum;
export const INITIAL_TO_CHAIN_ID = ChainId.Base;
export const INITIAL_ASSET_SYMBOL = AssetSymbol.USDC;

// Derived from the initial asset's first preset so the boot state always
// matches a real preset of the selected asset. Fail loud at module load if
// the asset is ever misconfigured without presets.
export const INITIAL_PRESET_INDEX = 0;
const initialPreset = ASSETS[INITIAL_ASSET_SYMBOL].presets.at(INITIAL_PRESET_INDEX);
if (!initialPreset) throw new Error(`${INITIAL_ASSET_SYMBOL} must define at least one amount preset`);
export const INITIAL_AMOUNT = initialPreset.amount;
