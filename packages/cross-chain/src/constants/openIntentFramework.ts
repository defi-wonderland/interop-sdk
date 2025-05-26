export const OPEN_ABI = [
    {
        inputs: [
            {
                components: [
                    { internalType: "uint32", name: "fillDeadline", type: "uint32" },
                    { internalType: "bytes32", name: "orderDataType", type: "bytes32" },
                    { internalType: "bytes", name: "orderData", type: "bytes" },
                ],
                internalType: "struct OnchainCrossChainOrder",
                name: "order",
                type: "tuple",
            },
        ],
        name: "open",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
