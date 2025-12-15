import { ExecutableQuote, SortingStrategy } from "../internal.js";

export class LowerEtaStrategy extends SortingStrategy {
    readonly name: string = "Lower Eta";
    readonly description: string = "Sort quotes by the lower eta";

    /**
     * Constructor
     */
    constructor() {
        super();
    }

    /**
     * @inheritdoc
     */
    getName(): string {
        return this.name;
    }

    /**
     * @inheritdoc
     */
    getDescription(): string {
        return this.description;
    }

    /**
     * @inheritdoc
     */
    sort(quotes: ExecutableQuote[]): ExecutableQuote[] {
        return quotes.sort((a, b): number => {
            if (!a.eta || !b.eta) return 0;

            const aEta = BigInt(a.eta);
            const bEta = BigInt(b.eta);

            if (aEta === bEta) return 0;
            return aEta < bEta ? -1 : 1;
        }) as ExecutableQuote[];
    }
}
