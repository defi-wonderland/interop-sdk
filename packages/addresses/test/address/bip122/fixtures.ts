import { fromHex } from "viem";

// BIP-350 test vectors
// https://github.com/bitcoin/bips/blob/master/bip-0350.mediawiki#test-vectors

// https://en.bitcoin.it/wiki/List_of_address_prefixes
export const BIP122_P2SH_ADDRESS = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";

export const BIP122_SEGWIT_ADDRESS = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";

// https://mempool.space/testnet/address/tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx
export const BIP122_TESTNET_SEGWIT_ADDRESS = "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";

export const BIP122_TAPROOT_ADDRESS =
    "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0";

// https://en.bitcoin.it/wiki/Genesis_block
export const BIP122_MAINNET_CHAIN_REF = fromHex("0x000000000019d6689c085ae165831e93", "bytes");
export const BIP122_TESTNET_CHAIN_REF = fromHex("0x000000000933ea01ad0ee984209779ba", "bytes");
