import { GetQuoteParams, ValidActions } from "../internal.js";

export interface ParamsParser<InputParams> {
    parseGetQuoteParams<Action extends ValidActions>(
        action: Action,
        params: InputParams,
    ): Promise<GetQuoteParams<ValidActions>>;
}
