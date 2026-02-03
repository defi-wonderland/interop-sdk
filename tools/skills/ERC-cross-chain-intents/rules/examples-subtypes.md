---
title: Sub-type Examples
impact: REFERENCE
tags: erc-7683, examples, message, calls
---

# Sub-type Examples

Examples from ERC-7683 showing how sub-types extend functionality.

## Message sub-type

Allows ERC-7683 intents to carry calldata executed on destination chain.

### Struct definitions

```solidity
/// @notice Calls that the user wants executed on the destination chain
/// @dev target is a contract the settlement contract will call
struct Calls {
    address target;
    bytes callData;
    uint256 value;
}

struct Message {
    Calls[] calls;
}
```

### Use case

User wants filler to execute arbitrary calldata on a target contract on their behalf. The settlement contract executes the calls atomically within `fill()`.

### Implementation in fill()

```solidity
function fill(bytes32 orderId, bytes calldata originData, bytes calldata fillerData) public {
    (
        address user,
        uint32 fillDeadline,
        Output memory fillerOutput,
        Message memory message
    ) = abi.decode(originData, (address, uint32, Output, Message));

    // ...validate order parameters...

    // ...execute fill logic of ResolvedCrossChainOrder...

    // Handle the Message subtype:
    uint256 length = message.calls.length;
    for (uint256 i = 0; i < length; ++i) {
        Call memory call = message.calls[i];

        // If calling EOA with calldata, assume target incorrectly specified
        if (call.callData.length > 0 && call.target.code.length == 0) {
            revert InvalidCall(i, calls);
        }

        (bool success, ) = call.target.call{ value: call.value }(call.callData);
        if (!success) revert CallReverted(i, message.calls);
    }
}
```


### Limitations

Because transactions execute via filler, `msg.sender` is the `DestinationSettler`, not the user. This limits use cases where target contract authenticates based on `msg.sender`.

### Solution

Combine with smart contract wallets:
- ERC-4337 (Account Abstraction)
- EIP-7702 (EOA code delegation)

This enables complete cross-chain delegated execution.

## Selecting a sub-type

Users select an `originSettler` known to support their desired sub-type. It's the responsibility of user and filler to ensure the `originSettler` supports the order's sub-type.

## References
- [ERC-7683](https://eips.ethereum.org/EIPS/eip-7683) - Examples section
