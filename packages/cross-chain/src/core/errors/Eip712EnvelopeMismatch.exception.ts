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

type Eip712MismatchScalar = string | number | bigint;

interface Eip712EnvelopeMismatchArgs {
    field: Eip712MismatchField;
    provider: string;
    primaryType?: string;
    expected?: Eip712MismatchScalar;
    received?: Eip712MismatchScalar;
    cause?: string;
}

export class Eip712EnvelopeMismatch extends ProviderGetQuoteFailure {
    public readonly field: Eip712MismatchField;
    public readonly provider: string;
    public readonly primaryType?: string;
    public readonly expected?: Eip712MismatchScalar;
    public readonly received?: Eip712MismatchScalar;

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
    if (args.expected !== undefined) parts.push(`expected=${formatScalar(args.expected)}`);
    if (args.received !== undefined) parts.push(`received=${formatScalar(args.received)}`);
    if (args.cause !== undefined) parts.push(args.cause);
    return parts.join("; ");
}

function formatScalar(value: Eip712MismatchScalar): string {
    return typeof value === "bigint" ? value.toString() : String(value);
}
