export const OPEN_ABI = [
    {
        type: "tuple",
        components: [
            { type: "uint256", name: "fillDeadline" },
            { type: "bytes32", name: "orderDataType" },
            { type: "bytes", name: "orderData" },
        ],
    },
];
