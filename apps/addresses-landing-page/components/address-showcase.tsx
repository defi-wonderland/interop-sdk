"use client";

import { encodeAddress } from "@wonderland/interop-addresses";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Animation constants
const SCRAMBLE_DURATION = 500; // Total time for scramble animation
const CYCLE_INTERVAL = 2500; // Time between chain changes
const SCRAMBLE_ITERATIONS = 3; // How many random chars before settling

// Characters to use for scramble effect
const SCRAMBLE_CHARS = "abcdef0123456789";

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

const getRandomChar = () => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];

interface ScrambleTextProps {
    text: string;
    isAnimating: boolean;
    onAnimationComplete?: () => void;
    className?: string;
    minWidth?: string;
    startFull?: boolean;
    preservePrefix?: number;
}

function ScrambleText({
    text,
    isAnimating,
    onAnimationComplete,
    className = "",
    minWidth = "min-w-[120px] md:min-w-[140px] lg:min-w-[160px]",
    startFull = false,
    preservePrefix = 0,
}: ScrambleTextProps) {
    const [displayText, setDisplayText] = useState(text);
    const animationRef = useRef<number | null>(null);
    const iterationsRef = useRef<number[]>([]);

    const animate = useCallback(() => {
        if (!isAnimating) {
            setDisplayText(text);
            return;
        }

        // For startFull mode: scramble all chars together, then reveal all at once
        if (startFull) {
            const startTime = performance.now();
            const prefix = text.slice(0, preservePrefix);

            const step = (currentTime: number) => {
                const elapsed = currentTime - startTime;

                if (elapsed >= SCRAMBLE_DURATION) {
                    // Time's up - reveal the correct text
                    setDisplayText(text);
                    onAnimationComplete?.();
                    return;
                }

                // Show prefix + random characters for the rest
                let newDisplay = prefix;
                for (let i = preservePrefix; i < text.length; i++) {
                    newDisplay += getRandomChar();
                }
                setDisplayText(newDisplay);
                animationRef.current = requestAnimationFrame(step);
            };

            animationRef.current = requestAnimationFrame(step);

            return () => {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
            };
        }

        // Progressive reveal mode (original behavior)
        iterationsRef.current = new Array(text.length).fill(0) as number[];

        const charDelay = SCRAMBLE_DURATION / text.length;
        let currentIndex = 0;
        let lastTime = performance.now();
        let scrambleTimer = 0;

        const step = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            scrambleTimer += deltaTime;

            // Calculate which character index we should be resolving up to
            const targetIndex = Math.min(Math.floor(scrambleTimer / charDelay), text.length);

            // Build the display string
            let newDisplay = "";
            for (let i = 0; i < text.length; i++) {
                if (i < currentIndex) {
                    // Already resolved
                    newDisplay += text[i];
                } else if (i === currentIndex && targetIndex > currentIndex) {
                    // Currently resolving this character
                    iterationsRef.current[i]++;
                    if (iterationsRef.current[i] >= SCRAMBLE_ITERATIONS) {
                        newDisplay += text[i];
                        currentIndex++;
                    } else {
                        newDisplay += getRandomChar();
                    }
                } else if (i <= targetIndex) {
                    // Show scrambled character
                    newDisplay += getRandomChar();
                } else {
                    // Not yet reached
                    newDisplay += " ";
                }
            }

            setDisplayText(newDisplay);

            if (currentIndex < text.length) {
                animationRef.current = requestAnimationFrame(step);
            } else {
                setDisplayText(text);
                onAnimationComplete?.();
            }
        };

        animationRef.current = requestAnimationFrame(step);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [text, isAnimating, onAnimationComplete, startFull, preservePrefix]);

    useEffect(() => {
        const cleanup = animate();
        return () => {
            cleanup?.();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animate]);

    // Update display when text changes and not animating
    useEffect(() => {
        if (!isAnimating) {
            setDisplayText(text);
        }
    }, [text, isAnimating]);

    return <span className={`inline-block ${minWidth} ${className}`}>{displayText}</span>;
}

export function AddressShowcase() {
    const [currentChainIndex, setCurrentChainIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

    // Cycle chain with scramble animation
    useEffect(() => {
        if (CHAINS.length === 0) return;

        const cycleToNext = () => {
            setCurrentChainIndex((prev) => (prev + 1) % CHAINS.length);
            if (!prefersReducedMotion) {
                setIsAnimating(true);
            }
        };

        const interval = setInterval(cycleToNext, CYCLE_INTERVAL);

        return () => clearInterval(interval);
    }, [prefersReducedMotion]);

    // Handle animation completion
    const handleAnimationComplete = useCallback(() => {
        setIsAnimating(false);
    }, []);

    const displayChainId = currentChain && chainId ? `eip155:${chainId}` : "";

    return (
        <div
            className="mb-0 bg-gray-50 border border-[oklch(0.22_0.11_269.06)] p-4 md:p-5 lg:px-8"
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
                    <ScrambleText
                        key={`chain-${currentChainIndex}`}
                        text={currentChain || ""}
                        isAnimating={isAnimating}
                        onAnimationComplete={handleAnimationComplete}
                    />
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
                    <ScrambleText
                        key={`chainId-${currentChainIndex}`}
                        text={displayChainId}
                        isAnimating={isAnimating}
                    />
                </div>

                {/* Third row: Binary address (full width) */}
                <div
                    className="font-mono text-xs md:text-sm lg:text-base text-[oklch(0.22_0.11_269.06)] mb-2 col-span-3 opacity-60"
                    aria-label="Encoded interoperable address"
                >
                    <ScrambleText
                        key={`binary-${currentChainIndex}`}
                        text={encodedAddress || ""}
                        isAnimating={isAnimating}
                        startFull
                        preservePrefix={2}
                        minWidth=""
                        className="break-all"
                    />
                </div>
            </div>
        </div>
    );
}
