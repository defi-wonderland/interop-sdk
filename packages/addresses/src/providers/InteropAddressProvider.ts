export class InteropAddressProvider {
    private constructor() {} // prevent instantiation

    public static humanReadableToBinary(): void {}

    public static binaryToHumanReadable(): void {}

    public static getChainId(): void {}

    public static getAddress(): void {}
}

export const humanReadableToBinary = InteropAddressProvider.humanReadableToBinary;
export const binaryToHumanReadable = InteropAddressProvider.binaryToHumanReadable;
export const getChainId = InteropAddressProvider.getChainId;
export const getAddress = InteropAddressProvider.getAddress;
