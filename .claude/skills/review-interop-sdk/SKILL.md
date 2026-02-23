---
name: review-interop-sdk
description: This skill should be used when the user asks to review code, review a pull request, review changes, review a diff, or perform a code review. It provides project-aware review with checks for TypeScript best practices, documentation, changesets, and test coverage.
allowed-tools: Read, Glob, Grep, Bash
---

# Code Review

You are acting as a code reviewer for the **interop-sdk** monorepo — a TypeScript pnpm workspace with Turbo, Changesets, Vitest, and Playwright.

## Step 1 — Determine review scope

Figure out what the user wants reviewed. Run these checks:

1. Check `git branch --show-current` and `git status`.
2. If the user passed a PR number or URL, use `gh pr view <number> --json baseRefName,headRefName,number,title,url` to get details.
3. If no PR was specified and the current branch is **not** `dev` or `main`, assume the user wants to review the current branch against `dev`.
4. If the current branch **is** `dev` or `main` and no PR/commit was specified, ask the user what they want reviewed (unstaged changes, a specific PR, a commit range, etc.).
5. **Never** run `git checkout` or `git switch` without explicit user approval.

Once the scope is clear, obtain the diff:

| Scope                       | Command                                         |
| --------------------------- | ----------------------------------------------- |
| PR (current branch vs base) | `git diff dev...HEAD` (or the appropriate base) |
| Unstaged changes            | `git diff`                                      |
| Staged changes              | `git diff --cached`                             |
| Specific commit             | `git show <sha>`                                |

## Step 2 — Read changed files for context

For each file in the diff, read the full file so you understand the surrounding context (imports, types, module structure). Use `Glob` and `Read` — do not rely solely on the diff hunks.

## Step 3 — Evaluate against the checklist

Review every item below. Only flag issues that:

-   Were **introduced in the diff**, not pre-existing code.
-   Are **discrete and actionable** — one issue per finding, not general observations.
-   Have **provable impact** on correctness, performance, security, or maintainability — don't speculate that a change _might_ break something; identify the affected code.
-   The **author would likely fix** if aware of them.
-   Don't rely on **unstated assumptions** about the codebase or author's intent.
-   Are **clearly not intentional** changes by the author.

Ignore trivial style issues unless they obscure meaning or violate documented standards. Don't stop at the first finding — list every qualifying issue. Do not generate a full PR fix; only flag issues with optional short suggestions.

### 3.1 Correctness & Security

-   Look for logic errors, race conditions, and incorrect assumptions.
-   Flag untrusted-input issues: open redirects, unparameterised SQL, SSRF on user-supplied URLs, unsanitised HTML (prefer escaping over sanitising).
-   Flag newly added dependencies — explain why they are or aren't justified.
-   Prefer fail-fast behaviour; flag logging-and-continue patterns that hide errors. Crashing is better than silent degradation.
-   Treat back-pressure handling as critical to system stability.
-   Ensure errors are checked against codes or stable identifiers, never error message strings.

### 3.2 TypeScript & Readability

Enforce the project's TypeScript and code-organisation rules as defined in:

-   `.claude/rules/backend/typescript-base.md` — type safety, code organisation, JSDoc
-   `.claude/rules/frontend/typescript.md` — naming, imports, `any` policy, explicit return types
-   `.claude/rules/backend/typescript-errors.md` — error class naming and structure
-   `.claude/rules/frontend/react-components.md` — component structure, single responsibility, import order

These rules are auto-loaded by path glob. During review, flag violations **only in the diff** — don't demand rigour inconsistent with the rest of the codebase.

### 3.3 Documentation

Check whether the change requires documentation updates at any of these layers:

| Layer                | Location                                                           | When to flag                                       |
| -------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| Package / app README | `packages/*/README.md`, `apps/*/README.md`, `examples/*/README.md` | Public API changes, new exports, changed behaviour |
| Docs site            | `apps/docs/docs/**`                                                | New features, changed APIs, new concepts           |
| Inline JSDoc         | Exported functions and types                                       | New or changed public surface                      |

Flag missing docs as **[P2]** with a concrete suggestion of which file(s) to update.

### 3.4 Changesets

If the diff touches files inside a publishable package (`packages/addresses`, `packages/cross-chain`, or `apps/sdk`), check whether a `.changeset/*.md` file is included in the diff.

-   **Missing changeset → [P1]**: remind the contributor to run `pnpm changeset`.
-   **Changeset present**: verify the bump level (patch / minor / major) is appropriate for the scope of change.

### 3.5 Test Coverage

-   Changes to `packages/*` or `apps/sdk` should have corresponding **Vitest** tests in the package's `test/` directory.
-   User-facing behaviour changes in `examples/ui` should consider **Playwright** E2E coverage in `examples/ui/tests/`.
-   Flag missing tests as **[P2]** with guidance on what scenarios to cover.
-   Do **not** demand tests for trivial changes (typos, config tweaks, docs-only).

## Step 4 — Format findings

Tag each finding with a priority level:

-   **[P0]** — Drop everything. Blocking release or operations. Only for issues that do not depend on assumptions about inputs.
-   **[P1]** — Urgent. Should be addressed before merge.
-   **[P2]** — Normal. To be fixed eventually.
-   **[P3]** — Low. Nice to have.

For each finding, include:

1. Priority tag and short title.
2. File path and line range (keep ranges under ~5–10 lines).
3. One paragraph explanation of why this is a problem and in what scenario it arises.
4. Optional `suggestion` code block with concrete replacement code (max 3 lines, preserve indentation).

### Comment style

-   Matter-of-fact, helpful tone — not accusatory.
-   Brief: at most one paragraph per finding.
-   No excessive flattery or filler phrases.
-   Write for quick comprehension.

## Step 5 — Verdict

End the review with one of:

-   **Verdict: correct** — No blocking issues found.
-   **Verdict: needs attention** — Has [P0] or [P1] findings that should be addressed before merge.

If there are zero qualifying findings, explicitly state the code looks good.
