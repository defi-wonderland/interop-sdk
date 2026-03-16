import { OrderStatus } from "@openintentsframework/oif-specs";
import { describe, expect, it } from "vitest";

import { adaptOrderStatus } from "../../src/protocols/lifi-intents/adapters/orderStatusAdapter.js";

describe("LI.FI Intents adaptOrderStatus", () => {
    it("maps 'Settled' to Finalized", () => {
        expect(adaptOrderStatus("Settled")).toBe(OrderStatus.Finalized);
    });

    it("maps 'Delivered' to Settling", () => {
        expect(adaptOrderStatus("Delivered")).toBe(OrderStatus.Settling);
    });

    it("maps 'Signed' to Pending", () => {
        expect(adaptOrderStatus("Signed")).toBe(OrderStatus.Pending);
    });

    it("maps 'Expired' to Failed", () => {
        expect(adaptOrderStatus("Expired")).toBe(OrderStatus.Failed);
    });

    it("maps 'Failed' to Failed", () => {
        expect(adaptOrderStatus("Failed")).toBe(OrderStatus.Failed);
    });

    it("maps empty string to Pending", () => {
        expect(adaptOrderStatus("")).toBe(OrderStatus.Pending);
    });

    it("maps unknown status to Pending", () => {
        expect(adaptOrderStatus("SomethingElse")).toBe(OrderStatus.Pending);
    });
});
