"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Characters to use for scramble effect
const SCRAMBLE_CHARS = "abcdef0123456789";

const getRandomChar = () => SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];

interface ScrambleTextProps {
    text: string;
    isAnimating: boolean;
    onAnimationComplete?: () => void;
    className?: string;
    minWidth?: string;
    startFull?: boolean;
    preservePrefix?: number;
    scrambleDuration?: number;
    scrambleIterations?: number;
}

export function ScrambleText({
    text,
    isAnimating,
    onAnimationComplete,
    className = "",
    minWidth = "min-w-[120px] md:min-w-[140px] lg:min-w-[160px]",
    startFull = false,
    preservePrefix = 0,
    scrambleDuration = 500,
    scrambleIterations = 3,
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

                if (elapsed >= scrambleDuration) {
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

        const charDelay = scrambleDuration / text.length;
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
                    if (iterationsRef.current[i] >= scrambleIterations) {
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
    }, [
        text,
        isAnimating,
        onAnimationComplete,
        startFull,
        preservePrefix,
        scrambleDuration,
        scrambleIterations,
    ]);

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
