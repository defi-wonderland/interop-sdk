"use client";

import { useState } from "react";

export function SdkSection() {
    const [copied, setCopied] = useState(false);

    return (
        <section id="sdk" className="px-6 lg:px-16 py-20 lg:py-24">
            <div className="max-w-3xl">
                <h2 className="font-mono text-[1.75rem] leading-[1.2] md:text-3xl md:leading-tight lg:text-4xl lg:leading-tight font-light mb-12 md:mb-16 lg:mb-20">
                    SDK & Implementation
                </h2>
                <div>
                    <p className="font-mono text-sm md:text-[0.9375rem] lg:text-base text-muted-foreground mb-8 leading-relaxed">
                        Install our SDK to implement Interoperable Addresses in your application.
                    </p>
                    <div className="relative mb-8 max-w-full">
                        <pre className="border border-gray-900 text-gray-900 font-mono text-xs sm:text-sm rounded py-3 px-4 pr-16 sm:pr-24 overflow-x-auto select-all max-w-full">
                            <span className="text-gray-400 select-none">$ </span>npm install
                            @wonderland/interop-addresses
                        </pre>
                        <button
                            className="absolute top-2.5 right-2 px-2 py-1 border bg-white border-gray-800 hover:bg-muted text-xs text-gray-900 hover:text-foreground rounded focus:outline-none active:bg-muted cursor-pointer transition"
                            onClick={() => {
                                navigator.clipboard.writeText(
                                    "npm install @wonderland/interop-addresses",
                                );
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            aria-label="Copy to clipboard"
                        >
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                    <a
                        href="https://github.com/defi-wonderland/interop-sdk/tree/main/packages/addresses#readme"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm underline hover:no-underline"
                    >
                        View Documentation →
                    </a>
                </div>
            </div>
        </section>
    );
}
