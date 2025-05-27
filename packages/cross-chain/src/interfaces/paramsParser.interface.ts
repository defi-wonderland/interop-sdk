import { GetQuoteParams, ValidActions } from "../internal.js";

/**
 * A interface for a parser for params
 */
export interface ParamsParser<InputParams> {
    /**
     * Parse the params for a get quote action
     * @param action - The action to parse the params for
     * @param params - The params to parse
     * @returns The parsed params
     */
    parseGetQuoteParams<Action extends ValidActions>(
        action: Action,
        params: InputParams,
    ): Promise<GetQuoteParams<ValidActions>>;
}
