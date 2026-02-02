---
name: update-docs
description: Perform exhaustive documentation verification and update for interop-sdk. Reviews all documentation files, validates every code example, and ensures documentation matches the current codebase.
---

# Update Documentation Command

You are executing the `/update-docs` command for the interop-sdk project. Follow this protocol for exhaustive documentation verification.

## Step 1: Analyze Recent Changes

First, identify what has changed:

```bash
# Check recent commits
git log --oneline -10 -- packages/

# Check uncommitted changes
git status --porcelain | grep packages/

# Check diff against main/dev
git diff dev --name-only | grep -E "packages/(addresses|cross-chain)"
```

## Step 2: Extract Current API

For each modified package, extract the current public API:

### @interop-sdk/addresses
```bash
grep -E "^export " packages/addresses/src/external.ts
```

### @interop-sdk/cross-chain
```bash
grep -E "^export " packages/cross-chain/src/external.ts
```

## Step 3: Read All Documentation Files

You MUST read each of these files completely:

### Addresses Package
1. `apps/docs/docs/addresses.md`
2. `apps/docs/docs/addresses/api.md`
3. `apps/docs/docs/addresses/example.md`
4. `apps/docs/docs/addresses/getting-started.md`
5. `apps/docs/docs/addresses/advanced-usage.md`

### Cross-Chain Package
6. `apps/docs/docs/cross-chain.md`
7. `apps/docs/docs/cross-chain/api.md`
8. `apps/docs/docs/cross-chain/example.md`
9. `apps/docs/docs/cross-chain/getting-started.md`
10. `apps/docs/docs/cross-chain/advanced-usage.md`
11. `apps/docs/docs/cross-chain/providers.md`
12. `apps/docs/docs/cross-chain/across-provider.md`
13. `apps/docs/docs/cross-chain/oif-provider.md`
14. `apps/docs/docs/cross-chain/flow.md`
15. `apps/docs/docs/cross-chain/intent-tracking.md`

### General
16. `apps/docs/docs/about.md`
17. `apps/docs/docs/installation.md`
18. `README.md`

## Step 4: Validate Each Code Example

For EVERY code block in the documentation:

1. Extract the code
2. Add necessary imports if missing
3. Wrap in async context if needed
4. Execute using `pnpm tsx`
5. Compare output with documented output

```bash
# Create temp file
cat > /tmp/validate-example.ts << 'EOF'
// Paste extracted code here
EOF

# Run validation
pnpm tsx /tmp/validate-example.ts
```

## Step 5: Verify API Claims

For each function, class, or type mentioned in documentation:

1. Find it in the source code
2. Verify the signature matches
3. Verify the description is accurate
4. Note the source location for citation

## Step 6: Apply Corrections

### Automatic Corrections
Apply these automatically:
- Updated function signatures
- Fixed imports
- Corrected output examples
- Updated version numbers

### Ask User First
Use AskUserQuestion for:
- Removed or renamed functions
- Significant behavior changes
- Ambiguous documentation choices
- New features without existing docs

## Step 7: Final Verification

After all corrections:
1. Re-run every code example
2. Verify all pass
3. Generate summary report

## Step 8: Report Results

Provide a summary:

```markdown
## Documentation Verification Complete

### Summary
- Files Reviewed: X
- Code Examples Tested: Y
- Issues Found: Z
- Corrections Made: W

### Corrections Applied
- `file.md:line` - Description of change

### User Decisions Required
- Question 1 - User chose: Option
- Question 2 - User chose: Option

### Verification Status
All examples pass / X examples still failing

### Source Citations Added
- `file.md:line` -> `source.ts:line`
```

## Important Reminders

- Read EVERY file listed, not just ones you think are relevant
- Test EVERY code example, not just ones that look changed
- NEVER skip validation steps
- NEVER invent examples - extract from tests or create minimal verified ones
- ALWAYS use AskUserQuestion when uncertain
- ALWAYS cite source code locations when adding content

## Skill Reference

This command uses the docs-verification skill. For detailed protocols, see:
- `skills/docs-verification/SKILL.md`
- `skills/docs-verification/references/verification-protocol.md`
- `skills/docs-verification/references/package-mapping.md`
- `skills/docs-verification/references/example-patterns.md`
