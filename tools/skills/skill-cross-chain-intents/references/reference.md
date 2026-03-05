# Reference

Organized by workflow: Understand → Implement → Customization → Security

---

## 1. Understand

### Flows

**Gasless cross-chain intents flow:**
1. User signs an off-chain message defining the parameters of their order
2. Order is disseminated to fillers
3. Filler calls `resolveFor()` to unpack the order's requirements
4. Filler opens the order on the origin chain via `openFor()`
5. Filler fills each leg of the order on the destination chain(s)
6. Cross-chain settlement process takes place

**Onchain cross-chain intents flow:**
1. User signs a transaction calling `open()` with their order
2. Filler retrieves the emitted `Open` event to determine requirements
3. Filler fills each leg of the order on the destination chain(s)
4. Cross-chain settlement process takes place

### Order Types

**GaslessCrossChainOrder** - User signs off-chain, filler submits via `openFor()`:
- `originSettler`, `user`, `nonce`, `originChainId`, `openDeadline`, `fillDeadline`, `orderDataType`, `orderData`
- `openDeadline`: Deadline for order opening on origin chain
- `fillDeadline`: Timestamp by which order must be filled on destination chain

**OnchainCrossChainOrder** - User calls `open()` directly:
- `fillDeadline`, `orderDataType`, `orderData`
- Note: NO `openDeadline` field

**ResolvedCrossChainOrder** - Generic representation after resolution:
- `user`, `originChainId`, `openDeadline`, `fillDeadline`, `orderId`
- `maxSpent[]` - cap on filler liability
- `minReceived[]` - floor on filler receipts
- `fillInstructions[]` - one per leg

### Supporting Structs

**Output**:
- `token` (bytes32) - `address(0)` = native token
- `amount` (uint256)
- `recipient` (bytes32) - `address(0)` = filler unknown
- `chainId` (uint256)

**FillInstruction**:
- `destinationChainId` (uint256)
- `destinationSettler` (bytes32)
- `originData` (bytes) - opaque, pass through as-is

**Why originData is opaque**: The opaqueness allows settler implementations to freely customize the data they transmit. Because fillers do not need to interpret this information, the opaqueness does not result in any additional implementation costs on fillers. This also makes it feasible for a user, filler, or order distribution system to perform an end-to-end simulation of the order initiation and fill without understanding the nuances of a particular execution system.

### Why bytes32 instead of address?
Cross-compatibility with non-EVM chains. Solana addresses are 32 bytes, EVM are 20. Using bytes32 allows larger identifiers.

### Filler
A participant who fulfils a user intent on the destination chain(s) and receives payment as a reward. (ERC-7683 Glossary)

### orderData and Sub-types
The `orderData` field is arbitrary implementation-specific data. May contain:
- Tokens involved
- Destination chain IDs
- Fulfillment constraints
- Fees

`orderDataType` is EIP-712 typehash identifying the sub-type. User and filler must ensure `originSettler` supports it.

Sub-types SHOULD be registered in subtypes repository for interoperability.

---

## 2. Implement

### IOriginSettler Interface

```solidity
interface IOriginSettler {
    event Open(bytes32 indexed orderId, ResolvedCrossChainOrder resolvedOrder);

    function openFor(
        GaslessCrossChainOrder calldata order,
        bytes calldata signature,
        bytes calldata originFillerData
    ) external;

    function open(OnchainCrossChainOrder calldata order) external;

    function resolveFor(
        GaslessCrossChainOrder calldata order,
        bytes calldata originFillerData
    ) external view returns (ResolvedCrossChainOrder memory);

    function resolve(
        OnchainCrossChainOrder calldata order
    ) external view returns (ResolvedCrossChainOrder memory);
}
```

**resolveFor purpose**: Resolves a specific GaslessCrossChainOrder into a generic ResolvedCrossChainOrder. Enables fillers to validate and assess orders without implementation-specific knowledge.

### IDestinationSettler Interface

```solidity
interface IDestinationSettler {
    function fill(
        bytes32 orderId,
        bytes calldata originData,
        bytes calldata fillerData
    ) external;
}
```

### Order Structs

```solidity
struct GaslessCrossChainOrder {
    address originSettler;
    address user;
    uint256 nonce;
    uint256 originChainId;
    uint32 openDeadline;
    uint32 fillDeadline;
    bytes32 orderDataType;
    bytes orderData;
}

struct OnchainCrossChainOrder {
    uint32 fillDeadline;
    bytes32 orderDataType;
    bytes orderData;
}

struct ResolvedCrossChainOrder {
    address user;
    uint256 originChainId;
    uint32 openDeadline;
    uint32 fillDeadline;
    bytes32 orderId;
    Output[] maxSpent;
    Output[] minReceived;
    FillInstruction[] fillInstructions;
}
```

### Message Sub-type Example

Allows intents to carry calldata executed on destination:

```solidity
struct Calls {
    address target;
    bytes callData;
    uint256 value;
}

struct Message {
    Calls[] calls;
}

function fill(bytes32 orderId, bytes calldata originData, bytes calldata fillerData) public {
    (
        address user,
        uint32 fillDeadline,
        Output memory fillerOutput,
        Message memory message
    ) = abi.decode(originData);

    // ...Do some preprocessing on the parameters here to validate the order...

    // ...Execute the fill logic of the ResolvedCrossChainOrder...

    // Handle the Message subtype:

    // Revert if any of the message calls fail.
    uint256 length = message.calls.length;
    for (uint256 i = 0; i < length; ++i) {
        Call memory call = message.calls[i];

        // If we are calling an EOA with calldata, assume target was incorrectly specified and revert.
        if (call.callData.length > 0 && call.target.code.length == 0) {
            revert InvalidCall(i, calls);
        }

        (bool success, ) = call.target.call{ value: call.value }(call.callData);
        if (!success) revert CallReverted(i, message.calls);
    }
}
```

**Limitation**: `msg.sender` is DestinationSettler, not user. For user auth, combine with ERC-4337 or EIP-7702.

---

## 3. Customization

### Price Resolution Options
- Dutch auctions (origin or destination)
- Oracle-based pricing

### Settlement Flexibility
- Various verification mechanisms
- Different cross-chain messaging systems
- Fill can happen BEFORE `open` in some systems

### fillerData and originFillerData
- `originFillerData`: Used in `openFor()`, `resolveFor()` on origin
- `fillerData`: Used in `fill()` on destination
- May include timing/form of payment preferences

### Permit2 Integration
Permit2 is not required but provides an efficient approach:
- `nonce` in order struct should be a permit2 nonce
- `openDeadline` in order struct should be the permit2 deadline
- Full order struct including parsed `orderData` should be used as the witness type during permit2 call (ensures maximum transparency to user)

---

## 4. Security

### Settlement Verification NOT Standardized
ERC-7683 is agnostic to how settlement validates fulfillment.

### Responsibility
- **Fillers**: Must evaluate settlement contract before filling
- **Applications**: Must evaluate before creating user orders

### Future
ERC hopes to support a dedicated standard for safe, trustless cross-chain verification.

---

## Sources

| Standard | Direct Link |
|----------|-------------|
| ERC-7683 | https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7683.md |
| EIP-712 | https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md |
| ERC-7930 | https://github.com/ethereum/ERCs/blob/master/ERCS/erc-7930.md |

**Link format pattern**:
- ERCs: `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-{number}.md`
- EIPs: `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-{number}.md`
- CAIPs: `https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-{number}.md`
