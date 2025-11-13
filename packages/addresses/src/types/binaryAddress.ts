import { Hex } from "viem";

export type BinaryAddress = Hex & { __brand: "BinaryAddress" };
