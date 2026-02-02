# Example Extraction and Validation Patterns

This document describes how to extract, validate, and create documentation examples.

## Extracting Code Blocks from Markdown

### Regex Pattern for TypeScript Blocks
```regex
```typescript\n([\s\S]*?)```
```

### Common Code Block Types
1. **Import statements** - Usually at file top
2. **Function calls** - Main example content
3. **Output blocks** - Expected results (often in separate block)

## Validation Categories

### Category 1: Import-Only Validation
Check that imports are valid:
```typescript
// Just verify this doesn't throw
import { InteropAddressProvider } from "@interop-sdk/addresses";
```

Validation script:
```bash
echo 'import { InteropAddressProvider } from "@interop-sdk/addresses";' | pnpm tsx --eval
```

### Category 2: Sync Execution
Code that runs synchronously:
```typescript
import { isValidInteropAddress } from "@interop-sdk/addresses";

const isValid = isValidInteropAddress("alice.eth@eip155:1#ABCD1234");
console.log(isValid); // true
```

Validation: Run directly, compare output.

### Category 3: Async Execution
Code requiring async context:
```typescript
import { getAddress } from "@interop-sdk/addresses";

const address = await getAddress("vitalik.eth@eip155:1");
console.log(address);
```

Validation: Wrap in async main:
```typescript
import { getAddress } from "@interop-sdk/addresses";

async function main() {
  const address = await getAddress("vitalik.eth@eip155:1");
  console.log(address);
}
main();
```

### Category 4: Environment-Dependent
Code requiring specific setup:
```typescript
import { createCrossChainProvider } from "@interop-sdk/cross-chain";

const provider = createCrossChainProvider("across", {
  rpcUrl: process.env.RPC_URL,
});
```

Validation: May need mock environment or skip validation with note.

### Category 5: Partial/Conceptual
Code that illustrates a concept but isn't runnable:
```typescript
// Conceptual - not directly runnable
interface MyCustomResolver {
  resolve(address: string): Promise<string>;
}
```

Validation: Mark as conceptual, verify types exist.

## Creating Validation Wrappers

### Basic Wrapper Template
```typescript
// validate-example.ts
import { readFileSync } from "fs";

const code = process.argv[2] || readFileSync(process.argv[3], "utf-8");

const wrapper = `
${code.includes("await") ? "async function main() {" : "function main() {"}
  ${code}
}
main().then(r => {
  if (r !== undefined) console.log(JSON.stringify(r));
}).catch(e => {
  console.error("VALIDATION_ERROR:", e.message);
  process.exit(1);
});
`;

// Write and execute
```

### Handling Common Issues

#### Missing Imports
If example assumes imports from context:
```typescript
// Documentation shows:
const result = humanReadableToBinary("alice.eth@eip155:1#ABCD1234");

// Wrapper adds:
import { humanReadableToBinary } from "@interop-sdk/addresses";
const result = humanReadableToBinary("alice.eth@eip155:1#ABCD1234");
```

#### Incomplete Async
If example is inside async function but docs don't show wrapper:
```typescript
// Documentation shows:
const quote = await provider.getQuote(params);

// Wrapper provides async context:
async function main() {
  const quote = await provider.getQuote(params);
}
```

## Extracting Examples from Tests

### Pattern: Describe Block
```bash
grep -A 50 'describe("FunctionName"' packages/*/test/*.test.ts
```

### Pattern: It Block
```bash
grep -A 20 'it("should.*"' packages/*/test/*.test.ts
```

### Pattern: Specific Assertion
```bash
grep -B 5 -A 5 'expect(functionName' packages/*/test/*.test.ts
```

### Converting Test to Example
Test code:
```typescript
it("should resolve ENS name", async () => {
  const result = await getAddress("vitalik.eth");
  expect(result).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
});
```

Documentation example:
```typescript
import { getAddress } from "@interop-sdk/addresses";

const address = await getAddress("vitalik.eth");
console.log(address);
// Output: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

## Output Verification

### Exact Match
When output must be exact:
```typescript
// Expected output: "0x1234..."
const actual = result.toLowerCase();
const expected = "0x1234...".toLowerCase();
assert(actual === expected);
```

### Pattern Match
When output format matters but values vary:
```typescript
// Expected: Ethereum address
const addressPattern = /^0x[a-fA-F0-9]{40}$/;
assert(addressPattern.test(result));
```

### Structure Match
When output structure matters:
```typescript
// Expected: { success: true, data: {...} }
assert(typeof result === "object");
assert(result.success === true);
assert(typeof result.data === "object");
```

## Documentation Best Practices

### Always Include Imports
```typescript
// Good
import { getAddress } from "@interop-sdk/addresses";
const addr = await getAddress("vitalik.eth");

// Bad - assumes reader knows the import
const addr = await getAddress("vitalik.eth");
```

### Show Expected Output
```typescript
const result = await getQuote(params);
console.log(result);
// Output:
// {
//   inputAmount: "1000000000000000000",
//   outputAmount: "999000000000000000",
//   fee: "0.1%"
// }
```

### Handle Errors
```typescript
try {
  const result = await riskyOperation();
} catch (error) {
  if (error instanceof InvalidAddressError) {
    console.log("Invalid address provided");
  }
}
```

### Show Both Success and Failure
```typescript
// Valid address
isValidInteropAddress("alice.eth@eip155:1#ABCD1234"); // true

// Invalid address
isValidInteropAddress("not-valid"); // false
```

## Automated Extraction Script

### Extract All Code Blocks
```bash
#!/bin/bash
# extract-examples.sh

FILE=$1
OUTPUT_DIR=${2:-"./extracted-examples"}

mkdir -p "$OUTPUT_DIR"

# Extract typescript blocks
awk '/```typescript/,/```/' "$FILE" | \
  grep -v '```' | \
  split -p '^$' - "$OUTPUT_DIR/example-"
```

### Validate All Examples
```bash
#!/bin/bash
# validate-all-examples.sh

for example in extracted-examples/example-*; do
  echo "Validating $example..."
  pnpm tsx "$example" 2>&1 || echo "FAILED: $example"
done
```

## Handling Non-Runnable Examples

Some examples can't be run directly. Mark them clearly:

### Config Examples
```typescript
// Configuration example - not directly runnable
export default {
  providers: ["across", "uniswapx"],
  defaultChain: 1,
};
```

### Type Examples
```typescript
// Type definition - compile-time only
type MyHandler = (event: CrossChainEvent) => Promise<void>;
```

### Pseudo-Code
```typescript
// Pseudo-code - illustrates concept
// 1. Get quote
// 2. Approve tokens
// 3. Execute swap
// 4. Wait for confirmation
```

## Integration with Validation Script

Pass these flags to the validation script:

| Flag | Meaning |
|------|---------|
| `--async` | Wrap in async main() |
| `--skip` | Don't validate, just check syntax |
| `--env=KEY=VAL` | Set environment variable |
| `--timeout=5000` | Set execution timeout |
| `--expect=OUTPUT` | Verify output matches |
