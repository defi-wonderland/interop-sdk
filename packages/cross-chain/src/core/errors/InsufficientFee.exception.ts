/** Thrown when a same-token build-quote has output amount >= input amount, leaving no fee margin. */
export class InsufficientFee extends Error {
    constructor(inputAmount: string, outputAmount: string) {
        super(
            `output.amount (${outputAmount}) must be less than input.amount (${inputAmount}) to allow for a fee margin`,
        );
    }
}
