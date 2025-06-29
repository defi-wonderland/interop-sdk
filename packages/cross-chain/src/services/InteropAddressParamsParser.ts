import {
    BinaryAddress,
    HumanReadableAddress,
    InteropAddressProvider,
    isValidBinaryAddress,
} from "@defi-wonderland/interop-addresses";
import { Address, isAddress } from "viem";
import { z } from "zod";

import {
    GetQuoteParams,
    HexAddressSchema,
    ParamsParser,
    SupportedChainIdSchema,
    UnsupportedAction,
    UnsupportedAddress,
    ValidActions,
} from "../internal.js";

type ValidInteropAddress = HumanReadableAddress | BinaryAddress;

type ValidAddress = ValidInteropAddress | { address: Address; chainId: number };

type TransferInteropAddressParams = {
    sender: ValidAddress;
    recipient: ValidAddress;
    amount: string;
    inputTokenAddress: Address;
    outputTokenAddress: Address;
};

type SwapInteropAddressParams = {
    sender: ValidAddress;
    recipient: ValidAddress;
    amount: string;
    inputTokenAddress: Address;
    outputTokenAddress: Address;
    slippage: string;
};

type InteropParams<Action extends ValidActions> = {
    crossChainTransfer: TransferInteropAddressParams;
    crossChainSwap: SwapInteropAddressParams;
}[Action];

/**
 * A parser for interop address params
 * TODO: Try to improve typing here https://github.com/defi-wonderland/interop-sdk/pull/23#discussion_r2107826673
 */
export class InteropAddressParamsParser implements ParamsParser<InteropParams<ValidActions>> {
    /**
     * Get the chain id from the interop address
     * @param address - The address to get the chain id from
     * @returns The chain id
     */
    private async getChainIdFromInteropAddress(
        address: ValidInteropAddress,
    ): Promise<z.infer<typeof SupportedChainIdSchema>> {
        const binaryAddress = isValidBinaryAddress(address as BinaryAddress)
            ? (address as BinaryAddress)
            : await InteropAddressProvider.humanReadableToBinary(address as HumanReadableAddress);

        return SupportedChainIdSchema.parse(await InteropAddressProvider.getChainId(binaryAddress));
    }

    /**
     * Get the address from the interop address
     * @param address - The address to get the address from
     * @returns The address
     */
    private async getAddressFromInteropAddress(
        address: ValidInteropAddress,
    ): Promise<z.infer<typeof HexAddressSchema>> {
        const binaryAddress = isValidBinaryAddress(address as BinaryAddress)
            ? (address as BinaryAddress)
            : await InteropAddressProvider.humanReadableToBinary(address as HumanReadableAddress);

        const parsedAddress = await InteropAddressProvider.getAddress(binaryAddress);

        if (isAddress(parsedAddress)) {
            return parsedAddress;
        }

        throw new UnsupportedAddress(address);
    }

    /**
     * Get the chain id from ValidAddress
     * @param address - The address to get the chain id from
     * @returns The chain id
     */
    private async getChainId(
        address: ValidAddress,
    ): Promise<z.infer<typeof SupportedChainIdSchema>> {
        if (typeof address === "object" && "chainId" in address) {
            return SupportedChainIdSchema.parse(address.chainId);
        }

        return await this.getChainIdFromInteropAddress(address as ValidInteropAddress);
    }

    /**
     * Get the address from ValidAddress
     * @param address - The address to get the address from
     * @returns The address
     */
    private async getAddress(address: ValidAddress): Promise<z.infer<typeof HexAddressSchema>> {
        if (typeof address === "object" && "address" in address && "chainId" in address) {
            return address.address;
        }
        return await this.getAddressFromInteropAddress(address as ValidInteropAddress);
    }

    /**
     * Parse the params for a cross chain transfer action
     * @param params - The params to parse
     * @returns The parsed params
     */
    async parseTransferParams(
        params: TransferInteropAddressParams,
    ): Promise<GetQuoteParams<"crossChainTransfer">> {
        const { sender, recipient, amount, inputTokenAddress, outputTokenAddress } = params;

        const [inputChainId, outputChainId, senderAddress, recipientAddress] = await Promise.all([
            this.getChainId(sender),
            this.getChainId(recipient),
            this.getAddress(sender),
            this.getAddress(recipient),
        ]);

        return {
            inputTokenAddress: inputTokenAddress,
            outputTokenAddress: outputTokenAddress,
            inputAmount: amount,
            inputChainId,
            outputChainId,
            sender: senderAddress,
            recipient: recipientAddress,
        };
    }

    /**
     * Parse the params for a cross chain swap action
     * @param params - The params to parse
     * @returns The parsed params
     */
    async parseSwapParams(
        params: SwapInteropAddressParams,
    ): Promise<GetQuoteParams<"crossChainSwap">> {
        return {
            ...(await this.parseTransferParams(params)),
            slippage: params.slippage,
        };
    }

    /**
     * @inheritdoc
     */
    async parseGetQuoteParams<Action extends ValidActions>(
        action: Action,
        params: InteropParams<Action>,
    ): Promise<GetQuoteParams<Action>> {
        switch (action) {
            case "crossChainTransfer":
                return (await this.parseTransferParams(
                    params as TransferInteropAddressParams,
                )) as GetQuoteParams<Action>;
            case "crossChainSwap":
                return (await this.parseSwapParams(
                    params as SwapInteropAddressParams,
                )) as GetQuoteParams<Action>;
            default:
                throw new UnsupportedAction(action);
        }
    }
}
