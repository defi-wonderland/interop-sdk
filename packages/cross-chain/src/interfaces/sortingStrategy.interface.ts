import { ExecutableQuote } from "./quotes.interface.js";

export abstract class SortingStrategy {
    abstract readonly name: string;
    abstract readonly description: string;

    /**
     * Get the name of the sorting strategy
     * @returns The name of the sorting strategy
     */
    abstract getName(): string;

    /**
     * Get the description of the sorting strategy
     * @returns The description of the sorting strategy
     */
    abstract getDescription(): string;

    /**
     * Sort the quotes by the sorting strategy
     * @param quotes - The quotes to sort
     * @returns The sorted quotes
     */
    abstract sort(quotes: ExecutableQuote[]): ExecutableQuote[];
}
