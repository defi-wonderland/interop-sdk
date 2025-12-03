import { ExecutableQuote, SortingStrategy } from "../internal.js";

export class BestOutputStrategy extends SortingStrategy {
    readonly name: string = "Best Output";
    readonly description: string = "Sort quotes by the highest output amount";

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
            if (!a.preview.outputs[0]?.amount || !b.preview.outputs[0]?.amount) return 0;

            return Number(
                BigInt(b.preview.outputs[0]?.amount) - BigInt(a.preview.outputs[0]?.amount),
            );
        }) as ExecutableQuote[];
    }
}
