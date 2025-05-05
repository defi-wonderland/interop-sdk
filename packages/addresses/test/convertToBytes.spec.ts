import bs58 from "bs58";
import { hexToBytes } from "viem";
import { describe, expect, it } from "vitest";

import { InvalidConversionTypeError, InvalidDecimalError } from "../src/errors/index.js";
import { convertToBytes } from "../src/utils/convertToBytes.js";

describe("convertToBytes", () => {
    it("returns empty Uint8Array when input is undefined", () => {
        const result = convertToBytes(undefined, "hex");
        expect(result).toEqual(new Uint8Array());
    });

    it("converts hex string (with 0x)", () => {
        const input = "0xdeadbeef";
        const expected = hexToBytes(input);
        expect(convertToBytes(input, "hex")).toEqual(expected);
    });

    it("converts hex string (without 0x)", () => {
        const input = "deadbeef";
        const expected = hexToBytes(`0x${input}`);
        expect(convertToBytes(input, "hex")).toEqual(expected);
    });

    it("converts base58 string", () => {
        const input = "3mJr7AoUXx2Wqd"; // decodes to "hello world"
        const expected = bs58.decode(input);
        expect(convertToBytes(input, "base58")).toEqual(expected);
    });

    it("converts base64 string", () => {
        const input = btoa("hello world"); // base64 encode
        const expected = new Uint8Array([...atob(input)].map((c) => c.charCodeAt(0)));
        expect(convertToBytes(input, "base64")).toEqual(expected);
    });

    it("converts decimal string to hex and then bytes", () => {
        const decimal = "255";
        const expected = hexToBytes("0xff");
        expect(convertToBytes(decimal, "decimal")).toEqual(expected);
    });

    it("throws on invalid decimal input", () => {
        const input = "not-a-number";
        expect(() => convertToBytes(input, "decimal")).toThrow(InvalidDecimalError);
    });

    it("throws on invalid conversion type", () => {
        // @ts-expect-error intentional bad input
        expect(() => convertToBytes("test", "badType")).toThrow(InvalidConversionTypeError);
    });

    it("throws with descriptive error message on internal failure", () => {
        const badBase64 = "%%%";
        expect(() => convertToBytes(badBase64, "base64")).toThrow(
            /Failed to convert base64 input/i,
        );
    });
});
