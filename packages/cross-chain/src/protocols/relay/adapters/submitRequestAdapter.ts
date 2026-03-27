import type { Quote } from "../../../internal.js";
import type { RelaySubmitPermitRequest } from "../schemas.js";
import { ProviderExecuteFailure } from "../../../internal.js";

/**
 * Extract the Relay permit request body from a quote's signature step metadata.
 *
 * @param quote - The SDK quote containing a signature step with permit data.
 * @returns The Relay-formatted submit permit request body.
 * @throws {ProviderExecuteFailure} When the quote has no signature step or is missing permit metadata.
 */
export function adaptSubmitRequest(quote: Quote): RelaySubmitPermitRequest {
    const signatureStep = quote.order.steps.find((s) => s.kind === "signature");
    const metadata = signatureStep?.metadata as Record<string, unknown> | undefined;
    const postData = metadata?.relayPostData as { body?: RelaySubmitPermitRequest } | undefined;

    if (!postData?.body) {
        throw new ProviderExecuteFailure(
            "Missing permit data in signature step metadata. Ensure the quote was obtained with submissionModes including 'gasless'.",
            `quoteId: ${quote.quoteId}`,
        );
    }

    return postData.body;
}
