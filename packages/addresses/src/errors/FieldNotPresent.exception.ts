/**
 * Error thrown when a field is not present on an InteroperableAddress
 * but is required for a specific operation (e.g., getAddress/getChainId).
 */
export class FieldNotPresent extends Error {
    constructor(fieldName: "address" | "chainReference") {
        super(
            `InteroperableAddress does not have a ${fieldName} field. This field is optional in the InteroperableAddress type but required for this operation.`,
        );
        this.name = "FieldNotPresent";
    }
}
