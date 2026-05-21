import { ProviderGetQuoteFailure } from "./ProviderGetQuoteFailure.exception.js";

export type Eip712MismatchField =
    | "chainId"
    | "verifyingContract"
    | "primaryType"
    | "domainVersion"
    | "token"
    | "amount"
    | "deadline"
    | "user"
    | "to"
    | "recipient"
    | "structure";

interface Eip712EnvelopeMismatchArgs {
    field: Eip712MismatchField;
    provider: string;
    primaryType?: string;
    expected?: string | number;
    received?: string | number;
    cause?: string;
}

export class Eip712EnvelopeMismatch extends ProviderGetQuoteFailure {
    public readonly field: Eip712MismatchField;
    public readonly provider: string;
    public readonly primaryType?: string;
    public readonly expected?: string | number;
    public readonly received?: string | number;

    constructor(args: Eip712EnvelopeMismatchArgs) {
        super(buildMessage(args), args.cause);
        this.field = args.field;
        this.provider = args.provider;
        this.primaryType = args.primaryType;
        this.expected = args.expected;
        this.received = args.received;
    }
}

function buildMessage(args: Eip712EnvelopeMismatchArgs): string {
    const parts = [`EIP-712 envelope mismatch from "${args.provider}" on field "${args.field}"`];
    if (args.primaryType !== undefined) parts.push(`primaryType=${args.primaryType}`);
    if (args.expected !== undefined) parts.push(`expected=${args.expected}`);
    if (args.received !== undefined) parts.push(`received=${args.received}`);
    if (args.cause !== undefined) parts.push(args.cause);
    return parts.join("; ");
}
