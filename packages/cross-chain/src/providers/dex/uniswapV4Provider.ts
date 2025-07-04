import { CommandType, RoutePlanner } from "@uniswap/universal-router-sdk";
import { Actions, SwapExactInSingle, V4Planner } from "@uniswap/v4-sdk";
import { encodeFunctionData, Hex } from "viem";

import {
    AcrossSwapMessageBuilder,
    SwapGetQuoteParams,
    UNISWAP_V4_TX_DEADLINE,
    UNIVERSAL_ROUTER_ABI,
} from "../../internal.js";

export class UniswapV4Provider implements AcrossSwapMessageBuilder {
    readonly protocolName: string;

    constructor() {
        this.protocolName = "uniswapV4";
    }

    buildAcrossMessage(params: SwapGetQuoteParams): Hex {
        const CurrentConfig: SwapExactInSingle = {
            poolKey: {
                currency0: params.inputTokenAddress,
                currency1: params.outputTokenAddress,
                fee: 500,
                tickSpacing: 10,
                hooks: "0x0000000000000000000000000000000000000000",
            },
            zeroForOne: true,
            amountIn: params.inputAmount,
            amountOutMinimum: "minAmountOut",
            hookData: "0x00",
        };

        const v4Planner = new V4Planner();
        const routePlanner = new RoutePlanner();

        const deadline = Math.floor(Date.now() / 1000) + UNISWAP_V4_TX_DEADLINE;

        v4Planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [CurrentConfig]);
        v4Planner.addAction(Actions.SETTLE_ALL, [
            CurrentConfig.poolKey.currency0,
            CurrentConfig.amountIn,
        ]);
        v4Planner.addAction(Actions.TAKE_ALL, [
            CurrentConfig.poolKey.currency1,
            CurrentConfig.amountOutMinimum,
        ]);

        const encodedActions = v4Planner.finalize() as `0x${string}`;

        routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.actions, v4Planner.params]);

        const encodedCommands = routePlanner.commands as `0x${string}`;

        const encodedMessage = encodeFunctionData({
            abi: UNIVERSAL_ROUTER_ABI,
            functionName: "execute",
            args: [encodedCommands, [encodedActions], BigInt(deadline)],
        });

        return encodedMessage;
    }
}
