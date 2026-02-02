# Documentation Verification Protocol

This document defines the exhaustive verification protocol for interop-sdk documentation.

## Pre-Verification Checklist

Before starting verification:
- [ ] Ensure you're in the project root
- [ ] Run `pnpm install` if dependencies might be stale
- [ ] Check `git status` for uncommitted changes
- [ ] Note the current HEAD commit for reference

## Phase 1: Change Detection

### Identify Modified Files
```bash
# Recent changes (last 5 commits)
git diff --name-only HEAD~5

# Changes since last doc update
git log --oneline --since="1 week ago" -- packages/

# Uncommitted changes
git status --porcelain | grep packages/
```

### Filter for Documentation Impact
Files that ALWAYS require doc verification:
- `packages/*/src/external.ts` - Public API changes
- `packages/*/src/index.ts` - Export changes
- `packages/*/src/types.ts` - Type definition changes
- `packages/*/package.json` - Version or dependency changes

## Phase 2: API Extraction

### Extract Public Exports
For each package with changes:

```bash
# Get all exports from external.ts
grep -E "^export " packages/addresses/src/external.ts

# Get all exports from index.ts
grep -E "^export " packages/addresses/src/index.ts

# Get all type exports
grep -E "^export (type|interface)" packages/addresses/src/*.ts
```

### Build Export Inventory
Create a list of:
1. Functions with their signatures
2. Classes with their public methods
3. Types and interfaces
4. Constants

## Phase 3: Documentation Audit

### For Each Documentation File

#### 3.1 Read Complete File
Do NOT skim. Read every line to understand:
- What the file claims to document
- What examples it provides
- What imports it references

#### 3.2 API Claims Checklist
For each function/class/type mentioned:
- [ ] Does it exist in the codebase?
- [ ] Is the signature correct?
- [ ] Are the parameter types accurate?
- [ ] Is the return type accurate?
- [ ] Is the description accurate?

#### 3.3 Example Verification
For each code block:
- [ ] Can it be extracted and run?
- [ ] Does it import from the correct locations?
- [ ] Does it produce the documented output?
- [ ] Does it use the current API (not deprecated)?

#### 3.4 Link Verification
For each internal link:
- [ ] Does the target file exist?
- [ ] Does the anchor exist in the target?

## Phase 4: Example Execution

### Create Test Harness
For each example, create a temporary file:

```typescript
// temp-example-{n}.ts
import { ... } from "@interop-sdk/addresses";

// Paste example code here
async function main() {
  // Example code
}

main().then(console.log).catch(console.error);
```

### Execute and Capture
```bash
pnpm tsx temp-example-{n}.ts 2>&1
```

### Compare Results
- If success: verify output matches documentation
- If failure: categorize the error:
  - Import error → API changed
  - Type error → Signature changed
  - Runtime error → Behavior changed

## Phase 5: Correction Protocol

### Automatic Corrections
Apply automatically when:
- Typo in function/class name
- Minor signature change (parameter renamed)
- Output format changed but meaning same
- Import path changed

Always add source citation:
```markdown
<!-- Source: packages/addresses/src/external.ts:42 -->
```

### User Confirmation Required
Ask user when:
- Function removed entirely
- Behavior fundamentally changed
- Multiple valid ways to document
- Example seems intentionally simplified

### Never Guess
If you cannot determine the correct behavior:
1. Search for tests that use the feature
2. Read the implementation
3. If still unclear, ASK THE USER

## Phase 6: Final Validation

### Re-run All Examples
After corrections, run every example again:
- All should pass
- Output should match documentation

### Cross-Reference Check
Verify that:
- All public exports are documented
- No documented items are missing from code
- All links work

### Generate Report
```markdown
## Verification Complete

**Commit**: {git rev}
**Date**: {timestamp}
**Files Reviewed**: X
**Examples Tested**: Y
**Corrections Made**: Z
**User Decisions**: W

### Changes Applied
- file.md:line - description

### Unresolved Items
- None / list
```

## Error Handling

### Common Issues

#### "Module not found"
- Check if package is built: `pnpm build`
- Check import path matches package exports

#### "Type X is not exported"
- Type was made internal
- Documentation needs update

#### "Function X is deprecated"
- Document the deprecation
- Add migration guide
- Link to replacement

#### "Example times out"
- Likely async issue
- Check if await is missing
- Check if mock data is needed

## Documentation Standards

### Code Blocks
Always specify language:
```typescript
const result = await someFunction();
```

### Output Blocks
Use separate code block:
```typescript
// Code
const result = await getAddress("vitalik.eth");
```
Output:
```
0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

### API Signatures
Include full TypeScript signature:
```typescript
function resolveAddress(
  address: string,
  options?: ResolveOptions
): Promise<Address>
```

### Parameters Table
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | string | Yes | The address to resolve |
| options | ResolveOptions | No | Resolution options |
