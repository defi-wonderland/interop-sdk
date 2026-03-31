/** Thrown when buildQuote is called with different input and output assets. */
export class DifferentAssetNotAllowed extends Error {
    constructor() {
        super(
            "buildQuote only supports same-asset transfers. Cross-token swaps are supported through getQuotes(), where solvers handle pricing and fee calculation.",
        );
        this.name = "DifferentAssetNotAllowed";
    }
}
