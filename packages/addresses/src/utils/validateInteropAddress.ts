import type { InteropAddress } from "../internal.js";
import { interopAddressSchema, ParseInteropAddressError } from "../internal.js";

export const validateInteropAddress = (interopAddress: InteropAddress): InteropAddress => {
    const result = interopAddressSchema.safeParse(interopAddress);
    if (!result.success) {
        throw new ParseInteropAddressError(result.error);
    }
    return result.data;
};
