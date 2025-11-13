import type { InteropAddress } from "../internal.js";
import { interopAddressSchema, ParseInteropAddress } from "../internal.js";

export const validateInteropAddress = (interopAddress: InteropAddress): InteropAddress => {
    const result = interopAddressSchema.safeParse(interopAddress);
    if (!result.success) {
        throw new ParseInteropAddress(result.error);
    }
    return result.data;
};
