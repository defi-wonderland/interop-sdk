import {
    IntentValidationsAggregator,
    IntentValidator,
    SettlerIntentValidator,
} from "../internal.js";

const ACROSS_VALID_SETTLERS: readonly string[] = [
    "0x000100000101742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
] as const;

export class IntentValidatorFactory {
    static createProtocolValidator(protocolName: string): IntentValidator {
        switch (protocolName) {
            case "across":
                return new IntentValidationsAggregator([
                    new SettlerIntentValidator(ACROSS_VALID_SETTLERS),
                ]);
            default:
                throw new Error(`Protocol ${protocolName} not supported`);
        }
    }
}
