import { ProviderGetQuoteFailure } from "./ProviderGetQuoteFailure.exception.js";

export type UntrustedSpenderField = "spender" | "transactionTo" | "signatureRecipient";

interface UntrustedSpenderArgs {
    provider: string;
    chainId: number;
    field: UntrustedSpenderField;
    received: string;
    trusted: string[];
}

export class UntrustedSpender extends ProviderGetQuoteFailure {
    public readonly provider: string;
    public readonly chainId: number;
    public readonly field: UntrustedSpenderField;
    public readonly received: string;
    public readonly trusted: string[];

    constructor(args: UntrustedSpenderArgs) {
        super(buildMessage(args));
        this.provider = args.provider;
        this.chainId = args.chainId;
        this.field = args.field;
        this.received = args.received;
        this.trusted = args.trusted;
    }
}

function buildMessage(args: UntrustedSpenderArgs): string {
    return [
        `Untrusted ${args.field} from "${args.provider}" on chain ${args.chainId}`,
        `received=${args.received}`,
        `trusted=${args.trusted.join("|") || "(none)"}`,
    ].join("; ");
}
