import type { Address } from "viem";
import { describe, expect, it, vi } from "vitest";

import type {
    AllowanceCheck,
    ApprovalValidationFailureHandler,
    ApprovalValidationViolation,
} from "../../../src/core/interfaces/approval.interface.js";
import type { ExecutableQuote } from "../../../src/core/schemas/quote.js";
import { PERMIT2_ADDRESS } from "../../../src/core/constants/eip712.js";
import { ApprovalValidationFailureReason } from "../../../src/core/interfaces/approval.interface.js";
import { DefaultApprovalValidator } from "../../../src/core/services/approval/DefaultApprovalValidator.js";

function spyHandler(): {
    handle: ReturnType<typeof vi.fn<(violation: ApprovalValidationViolation) => void>>;
} {
    return { handle: vi.fn<(violation: ApprovalValidationViolation) => void>() };
}

function validate(
    quote: ExecutableQuote,
    handler?: ApprovalValidationFailureHandler,
): AllowanceCheck[] {
    return new DefaultApprovalValidator(handler).validate(quote);
}

const USER = "0x1111111111111111111111111111111111111111" as Address;
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7" as Address;
const ROUTER = "0x2222222222222222222222222222222222222222" as Address;
const ATTACKER = "0x000000000000000000000000000000000000dEaD" as Address;
const NATIVE = "0x0000000000000000000000000000000000000000" as Address;
const CHAIN_ID = 1;

function makeQuote(opts: {
    allowances: AllowanceCheck[];
    steps?: ExecutableQuote["order"]["steps"];
    input?: { chainId: number; assetAddress: string; amount: string };
}): ExecutableQuote {
    const input = opts.input ?? { chainId: CHAIN_ID, assetAddress: USDC, amount: "1000" };
    return {
        order: {
            steps: opts.steps ?? [
                { kind: "transaction", chainId: CHAIN_ID, transaction: { to: ROUTER, data: "0x" } },
            ],
            checks: { allowances: opts.allowances },
        },
        preview: {
            inputs: [{ ...input, accountAddress: USER }],
            outputs: [{ chainId: 42161, accountAddress: USER, assetAddress: USDT, amount: "990" }],
        },
        provider: "test",
        _providerId: "test",
    };
}

function check(overrides: Partial<AllowanceCheck> = {}): AllowanceCheck {
    return {
        chainId: CHAIN_ID,
        tokenAddress: USDC,
        owner: USER,
        spender: ROUTER,
        required: "1000",
        ...overrides,
    };
}

describe("DefaultApprovalValidator", () => {
    it("returns an empty array when the quote has no allowance checks", () => {
        const quote = makeQuote({ allowances: [] });

        expect(validate(quote)).toEqual([]);
    });

    it("keeps a check whose spender is a transaction step target", () => {
        const quote = makeQuote({ allowances: [check({ spender: ROUTER })] });

        const valid = validate(quote);

        expect(valid).toHaveLength(1);
        expect(valid[0]!.spender).toBe(ROUTER);
    });

    it("keeps a check whose spender is canonical Permit2 even without a matching step", () => {
        const quote = makeQuote({
            allowances: [check({ spender: PERMIT2_ADDRESS })],
            steps: [
                {
                    kind: "signature",
                    chainId: CHAIN_ID,
                    signaturePayload: {
                        signatureType: "eip712",
                        domain: {},
                        primaryType: "PermitWitnessTransferFrom",
                        types: { EIP712Domain: [] },
                        message: {},
                    },
                },
            ],
        });

        const valid = validate(quote);

        expect(valid).toHaveLength(1);
        expect(valid[0]!.spender).toBe(PERMIT2_ADDRESS);
    });

    it("matches the step target case-insensitively", () => {
        const quote = makeQuote({
            allowances: [check({ spender: ROUTER.toUpperCase().replace("0X", "0x") })],
            steps: [
                {
                    kind: "transaction",
                    chainId: CHAIN_ID,
                    transaction: { to: ROUTER.toLowerCase(), data: "0x" },
                },
            ],
        });

        expect(validate(quote)).toHaveLength(1);
    });

    it("drops a check with an untrusted spender", () => {
        const handler = spyHandler();
        const quote = makeQuote({ allowances: [check({ spender: ATTACKER })] });

        const valid = validate(quote, handler);

        expect(valid).toEqual([]);
        expect(handler.handle).toHaveBeenCalledTimes(1);
        expect(handler.handle.mock.calls[0]![0].reason).toBe(
            ApprovalValidationFailureReason.UntrustedSpender,
        );
    });

    it("drops a check whose owner doesn't match the previewed input", () => {
        const handler = spyHandler();
        const quote = makeQuote({ allowances: [check({ owner: ATTACKER })] });

        expect(validate(quote, handler)).toEqual([]);
        expect(handler.handle.mock.calls[0]![0].reason).toBe(
            ApprovalValidationFailureReason.OwnerMismatch,
        );
    });

    it("drops a check whose token isn't the previewed input asset", () => {
        const handler = spyHandler();
        const quote = makeQuote({ allowances: [check({ tokenAddress: USDT })] });

        expect(validate(quote, handler)).toEqual([]);
        expect(handler.handle.mock.calls[0]![0].reason).toBe(
            ApprovalValidationFailureReason.TokenMismatch,
        );
    });

    it("drops a check on a chain with no previewed input", () => {
        const handler = spyHandler();
        const quote = makeQuote({ allowances: [check({ chainId: 10 })] });

        expect(validate(quote, handler)).toEqual([]);
        expect(handler.handle.mock.calls[0]![0].reason).toBe(
            ApprovalValidationFailureReason.ChainMismatch,
        );
    });

    it("drops a check for a native token", () => {
        const handler = spyHandler();
        const quote = makeQuote({
            input: { chainId: CHAIN_ID, assetAddress: NATIVE, amount: "1000" },
            allowances: [check({ tokenAddress: NATIVE })],
        });

        expect(validate(quote, handler)).toEqual([]);
        expect(handler.handle.mock.calls[0]![0].reason).toBe(
            ApprovalValidationFailureReason.NativeAsset,
        );
    });

    it("drops a check whose required exceeds the input amount", () => {
        const handler = spyHandler();
        const quote = makeQuote({ allowances: [check({ required: "5000" })] });

        expect(validate(quote, handler)).toEqual([]);
        expect(handler.handle.mock.calls[0]![0].reason).toBe(
            ApprovalValidationFailureReason.AmountExceedsInput,
        );
    });

    it("drops a check whose required amount is not a parseable number", () => {
        const handler = spyHandler();
        const quote = makeQuote({ allowances: [check({ required: "not-a-number" })] });

        expect(validate(quote, handler)).toEqual([]);
        expect(handler.handle.mock.calls[0]![0].reason).toBe(
            ApprovalValidationFailureReason.AmountExceedsInput,
        );
    });

    it("keeps preferInfinite when the spender is canonical Permit2", () => {
        const quote = makeQuote({
            allowances: [check({ spender: PERMIT2_ADDRESS, preferInfinite: true })],
        });

        const [valid] = validate(quote);

        expect(valid!.preferInfinite).toBe(true);
    });

    it("strips preferInfinite when the spender is not Permit2", () => {
        const quote = makeQuote({
            allowances: [check({ spender: ROUTER, preferInfinite: true })],
        });

        const [valid] = validate(quote);

        expect(valid!.preferInfinite).toBe(false);
    });

    it("keeps only the valid checks when a quote mixes valid and forged entries", () => {
        const handler = spyHandler();
        const quote = makeQuote({
            allowances: [check({ spender: ROUTER }), check({ spender: ATTACKER })],
        });

        const valid = validate(quote, handler);

        expect(valid).toHaveLength(1);
        expect(valid[0]!.spender).toBe(ROUTER);
        expect(handler.handle).toHaveBeenCalledTimes(1);
    });

    it("keeps validating when the failure handler throws", () => {
        const throwingHandler: ApprovalValidationFailureHandler = {
            handle() {
                throw new Error("telemetry down");
            },
        };
        const quote = makeQuote({
            allowances: [check({ spender: ATTACKER }), check({ spender: ROUTER })],
        });

        const valid = validate(quote, throwingHandler);

        expect(valid).toHaveLength(1);
        expect(valid[0]!.spender).toBe(ROUTER);
    });
});
