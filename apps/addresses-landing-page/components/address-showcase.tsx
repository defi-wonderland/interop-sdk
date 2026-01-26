"use client";

import { encodeAddress } from "@wonderland/interop-addresses";
import { useEffect, useMemo, useRef, useState } from "react";

// Animation constants
const ANIMATION_DURATION = 800;
const CYCLE_INTERVAL = 2000;
const MID_ANIMATION_DELAY = ANIMATION_DURATION / 2;

const CHAIN_IDS: Record<string, string> = {
    ethereum: "1",
    arbitrum: "42161",
    base: "8453",
    celo: "42220",
    optimism: "10",
    ink: "57073",
    linea: "59144",
    zksync: "324",
} as const;

const CHAINS = Object.keys(CHAIN_IDS) as Array<keyof typeof CHAIN_IDS>;

const ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const ENS_NAME = "vitalik.eth";

const abbreviateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

type AnimationState = "idle" | "sliding-out" | "sliding-in";

interface AnimatedCellProps {
    children: React.ReactNode;
    animationState: AnimationState;
    minWidth?: string;
    className?: string;
}

function AnimatedCell({
    children,
    animationState,
    minWidth = "min-w-[120px] md:min-w-[140px] lg:min-w-[160px]",
    className = "",
}: AnimatedCellProps) {
    const getTransform = () => {
        switch (animationState) {
            case "sliding-out":
                return "translate-y-[100%]";
            case "sliding-in":
                return "translate-y-[-100%]";
            case "idle":
            default:
                return "translate-y-0";
        }
    };

    return (
        <div
            className={`transition-transform ease-in-out ${getTransform()} ${className}`}
            style={{ transitionDuration: `${ANIMATION_DURATION}ms` }}
        >
            <span className={`inline-block ${minWidth}`}>{children}</span>
        </div>
    );
}

interface FadeCellProps {
    children: React.ReactNode;
    isVisible: boolean;
    className?: string;
}

function FadeCell({ children, isVisible, className = "" }: FadeCellProps) {
    return (
        <div
            className={`transition-opacity ease-in-out ${isVisible ? "opacity-100" : "opacity-0"} ${className}`}
            style={{ transitionDuration: `${ANIMATION_DURATION}ms` }}
        >
            {children}
        </div>
    );
}

export function AddressShowcase() {
    const [currentChainIndex, setCurrentChainIndex] = useState(0);
    const [animationState, setAnimationState] = useState<AnimationState>("idle");
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

    const currentChain = CHAINS[currentChainIndex];
    const chainId = currentChain ? CHAIN_IDS[currentChain] : null;

    // Compute the encoded interoperable address binary for the current chain
    const encodedAddress = useMemo(() => {
        if (!currentChain || !chainId) return "";

        try {
            const interopAddress = {
                version: 1,
                chainType: "eip155" as const,
                chainReference: chainId,
                address: ADDRESS,
            };
            return encodeAddress(interopAddress, { format: "hex" });
        } catch (error) {
            if (process.env.NODE_ENV === "development") {
                console.error("Failed to encode address:", error);
            }
            return "";
        }
    }, [currentChain, chainId]);

    // Check for reduced motion preference
    useEffect(() => {
        if (typeof window === "undefined") return;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
        setPrefersReducedMotion(mediaQuery.matches);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
        const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

        // Modern browsers support addEventListener
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (typeof mediaQuery.addEventListener === "function") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            mediaQuery.addEventListener("change", handleChange);
            return () => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                mediaQuery.removeEventListener("change", handleChange);
            };
        }
        // Fallback for older browsers (Safari < 14)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const legacyMediaQuery = mediaQuery as any;
        if (typeof legacyMediaQuery.addListener === "function") {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            legacyMediaQuery.addListener(handleChange);
            return () => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                legacyMediaQuery.removeListener(handleChange);
            };
        }
    }, []);

    // Cycle chain animation
    useEffect(() => {
        if (CHAINS.length === 0 || prefersReducedMotion) return;

        const clearTimeouts = () => {
            timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
            timeoutRefs.current = [];
        };

        const cycleToNext = () => {
            clearTimeouts();

            // Start slide out animation
            setAnimationState("sliding-out");

            // Update index mid-animation so new content is ready
            const timeout1 = setTimeout(() => {
                setCurrentChainIndex((prev) => (prev + 1) % CHAINS.length);
                setAnimationState("sliding-in");
            }, MID_ANIMATION_DELAY);
            timeoutRefs.current.push(timeout1);

            // After slide out, reset animation state to slide in new content
            const timeout2 = setTimeout(() => {
                setAnimationState("idle");
            }, ANIMATION_DURATION);
            timeoutRefs.current.push(timeout2);
        };

        const interval = setInterval(cycleToNext, CYCLE_INTERVAL);

        return () => {
            clearInterval(interval);
            clearTimeouts();
        };
    }, [prefersReducedMotion]);

    // If reduced motion, just cycle without animation
    useEffect(() => {
        if (!prefersReducedMotion) return;

        const interval = setInterval(() => {
            setCurrentChainIndex((prev) => (prev + 1) % CHAINS.length);
        }, CYCLE_INTERVAL);

        return () => clearInterval(interval);
    }, [prefersReducedMotion]);

    const displayChainId = currentChain && chainId ? `eip155:${chainId}` : "";

    return (
        <div
            className="mb-0 rounded-lg bg-gray-50 border border-gray-200 p-4 md:p-5 lg:p-6 shadow-sm"
            role="region"
            aria-label="Interoperable address showcase"
            aria-live="polite"
        >
            <div className="grid grid-cols-[auto_auto_1fr] gap-x-2 md:gap-x-3 lg:gap-x-4 items-baseline">
                {/* First row: ENS name */}
                <div className="font-mono text-lg md:text-xl lg:text-2xl text-[oklch(0.22_0.11_269.06)] mb-2">
                    <span className="opacity-90" aria-label="ENS name">
                        {ENS_NAME}
                    </span>
                </div>
                <div className="font-mono text-lg md:text-xl lg:text-2xl text-[oklch(0.22_0.11_269.06)] mb-2">
                    <span className="opacity-90" aria-hidden="true">
                        @
                    </span>
                </div>
                <div
                    className="font-mono text-lg md:text-xl lg:text-2xl text-[oklch(0.22_0.11_269.06)] mb-2 overflow-hidden relative"
                    aria-label={`Chain: ${currentChain || "loading"}`}
                >
                    <AnimatedCell
                        key={`chain-${currentChainIndex}`}
                        animationState={animationState}
                    >
                        {currentChain || ""}
                    </AnimatedCell>
                </div>

                {/* Second row: Address */}
                <div className="font-mono text-base md:text-lg lg:text-xl text-[oklch(0.22_0.11_269.06)] mb-2">
                    <span className="opacity-90" aria-label="Abbreviated address">
                        {abbreviateAddress(ADDRESS)}
                    </span>
                </div>
                <div
                    className="font-mono text-base md:text-lg lg:text-xl text-[oklch(0.22_0.11_269.06)] mb-2"
                    aria-hidden="true"
                />
                <div
                    className="font-mono text-base md:text-lg lg:text-xl text-[oklch(0.22_0.11_269.06)] mb-2 overflow-hidden relative"
                    aria-label={`Chain ID: ${displayChainId}`}
                >
                    <AnimatedCell
                        key={`chainId-${currentChainIndex}`}
                        animationState={animationState}
                    >
                        {displayChainId}
                    </AnimatedCell>
                </div>

                {/* Third row: Binary address (full width) */}
                <div
                    className="font-mono text-xs md:text-sm lg:text-base text-[oklch(0.22_0.11_269.06)] mb-2 col-span-3 opacity-60"
                    aria-label="Encoded interoperable address"
                >
                    <FadeCell
                        key={`binary-${currentChainIndex}`}
                        isVisible={animationState === "idle"}
                    >
                        <span className="inline-block break-all">{encodedAddress || ""}</span>
                    </FadeCell>
                </div>
            </div>
        </div>
    );
}
