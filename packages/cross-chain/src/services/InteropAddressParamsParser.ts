import {
    BinaryAddress,
    HumanReadableAddress,
    InteropAddressProvider,
    isValidBinaryAddress,
} from "@interop-sdk/addresses";
import { Address } from "viem";
import { z } from "zod";

import {
    GetQuoteParams,
    HexAddressSchema,
    ParamsParser,
    SupportedChainIdSchema,
    UnsupportedAction,
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

export class InteropAddressParamsParser implements ParamsParser<InteropParams<ValidActions>> {
    private async getChainIdFromInteropAddress(
        address: ValidInteropAddress,
    ): Promise<z.infer<typeof SupportedChainIdSchema>> {
        if (isValidBinaryAddress(address as BinaryAddress)) {
            return SupportedChainIdSchema.parse(
                InteropAddressProvider.getChainId(address as BinaryAddress),
            );
        }
        const binaryAddress = await InteropAddressProvider.humanReadableToBinary(
            address as HumanReadableAddress,
        );
        return SupportedChainIdSchema.parse(InteropAddressProvider.getChainId(binaryAddress));
    }

    private async getAddressFromInteropAddress(
        address: ValidInteropAddress,
    ): Promise<z.infer<typeof HexAddressSchema>> {
        if (isValidBinaryAddress(address as BinaryAddress)) {
            return InteropAddressProvider.getAddress(address as BinaryAddress);
        }
        const binaryAddress = await InteropAddressProvider.humanReadableToBinary(
            address as HumanReadableAddress,
        );
        return InteropAddressProvider.getAddress(binaryAddress);
    }

    private async getChainId(
        address: ValidAddress,
    ): Promise<z.infer<typeof SupportedChainIdSchema>> {
        if (typeof address === "object" && "chainId" in address) {
            return SupportedChainIdSchema.parse(address.chainId);
        }

        return await this.getChainIdFromInteropAddress(address as ValidInteropAddress);
    }

    private async getAddress(address: ValidAddress): Promise<z.infer<typeof HexAddressSchema>> {
        if (typeof address === "object" && "address" in address && "chainId" in address) {
            return address.address;
        }
        return await this.getAddressFromInteropAddress(address as ValidInteropAddress);
    }

    async parseTransferParams(
        params: TransferInteropAddressParams,
    ): Promise<GetQuoteParams<"crossChainTransfer">> {
        const { sender, recipient, amount, inputTokenAddress, outputTokenAddress } = params;

        return {
            inputTokenAddress: inputTokenAddress,
            outputTokenAddress: outputTokenAddress,
            inputAmount: amount,
            inputChainId: await this.getChainId(sender),
            outputChainId: await this.getChainId(recipient),
            sender: await this.getAddress(sender),
            recipient: await this.getAddress(recipient),
        };
    }

    async parseSwapParams(
        params: SwapInteropAddressParams,
    ): Promise<GetQuoteParams<"crossChainSwap">> {
        return {
            ...(await this.parseTransferParams(params)),
            slippage: params.slippage,
        };
    }

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
