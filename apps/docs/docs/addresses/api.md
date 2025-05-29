---
title: API
---

### InteropAddressProvider

A static class with utility methods for converting and validating interoperable addresses.

#### Methods

-   **humanReadableToBinary(humanReadableAddress: string): Promise\<BinaryAddress\>**

    Converts a human-readable address to its binary representation.

    ```typescript
    const binary = await InteropAddressProvider.humanReadableToBinary(
        "alice.eth@eip155:1#ABCD1234",
    );
    ```

-   **binaryToHumanReadable(binaryAddress: Hex): Promise\<HumanReadableAddress\>**

    Converts a binary address to its human-readable representation.

    ```typescript
    const human = await InteropAddressProvider.binaryToHumanReadable(
        "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045",
    );
    ```

-   **getChainId(address: string): Promise\<EncodedChainReference\<ChainTypeName\>\>**

    Extracts the chain ID from a human-readable or binary address.

    ```typescript
    const chainId = await InteropAddressProvider.getChainId("alice.eth@op#ABCD1234");
    ```

-   **getAddress(address: string): Promise\<EncodedAddress\<ChainTypeName\>\>**

    Extracts the address component from a human-readable or binary address.

    ```typescript
    const address = await InteropAddressProvider.getAddress("alice.eth@op#ABCD1234");
    ```

-   **buildFromPayload(payload: InteropAddressFields): BinaryAddress**

    Builds a binary interop address from a payload object.

    ```typescript
    const payload = {
        version: 1,
        chainType: "eip155",
        chainReference: "0x1",
        address: "0x1",
    };
    const binary = InteropAddressProvider.buildFromPayload(payload);
    ```

-   **computeChecksum(humanReadableAddress: string): Promise\<Checksum\>**

    Computes the checksum for a human-readable address.

    ```typescript
    const checksum = await InteropAddressProvider.computeChecksum("alice.eth@op");
    ```

-   **isValidInteropAddress(address: string, options?: ParseHumanReadableOptions): Promise\<boolean\>**

    Checks if a string is a valid interop address (human-readable or binary).

    ```typescript
    const isValid = await InteropAddressProvider.isValidInteropAddress("alice.eth@op");
    ```

-   **isValidHumanReadableAddress(humanReadableAddress: string, options?: ParseHumanReadableOptions): Promise\<boolean\>**

    Checks if a string is a valid human-readable interop address.

    ```typescript
    const isValid = await InteropAddressProvider.isValidHumanReadableAddress("alice.eth@op");
    ```

-   **isValidBinaryAddress(binaryAddress: Hex): boolean**

    Checks if a string is a valid binary interop address.

    ```typescript
    const isValid = InteropAddressProvider.isValidBinaryAddress(
        "0x00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045",
    );
    ```

All methods are also exported as individual functions for modular usage and tree-shaking.

## References

-   [ERC 7930: Interoperable Addresses - Fellowship of Ethereum Magicians](https://ethereum-magicians.org/t/erc-7930-interoperable-addresses/23365)
