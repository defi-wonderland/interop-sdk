import { BestOutputStrategy, LowerEtaStrategy, SortingStrategy } from "../internal.js";

export class SortingStrategyFactory {
    public static createStrategy(strategyName: string): SortingStrategy {
        switch (strategyName) {
            case "bestOutput":
                return new BestOutputStrategy();
            case "lowerEta":
                return new LowerEtaStrategy();
            default:
                throw new Error(`Strategy ${strategyName} not found`);
        }
    }
}
