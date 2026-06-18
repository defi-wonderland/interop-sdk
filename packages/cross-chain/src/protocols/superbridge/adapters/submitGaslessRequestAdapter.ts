import type { Hex } from "viem";

import type { Quote } from "../../../core/schemas/quote.js";
import type { SuperbridgeSubmitGaslessRequest } from "../schemas.js";
import { ProviderExecuteFailure } from "../../../internal.js";
import { SuperbridgeGaslessStepMetadataSchema } from "../schemas.js";

/**
 * Build a Superbridge `/v1/submit_gasless` request from a quote's signature step
 * metadata and the user's signature.
 *
 * @throws {ProviderExecuteFailure} When the quote lacks gasless metadata.
 */
export function adaptSubmitGaslessRequest(
    quote: Quote,
    signature: Hex,
): SuperbridgeSubmitGaslessRequest {
    const signatureStep = quote.order.steps.find((step) => step.kind === "signature");
    const metadata = SuperbridgeGaslessStepMetadataSchema.safeParse(signatureStep?.metadata);

    if (!metadata.success) {
        throw new ProviderExecuteFailure(
            "Missing Superbridge gasless metadata in signature step. Ensure submissionModes includes 'gasless'.",
            `quoteId: ${quote.quoteId}`,
        );
    }

    return {
        typedData: metadata.data.superbridgeTypedData,
        signature,
        id: metadata.data.superbridgeRouteId,
        chainId: metadata.data.superbridgeChainId,
    };
}
