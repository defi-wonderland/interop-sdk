"use client";

import { useState } from "react";

interface TerminalSnippetProps {
    command?: string;
}

export function TerminalSnippet({
    command = "npm install @wonderland/interop-addresses",
}: TerminalSnippetProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            void navigator.clipboard.writeText(command);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative mb-8 max-w-full">
            <pre className="border border-gray-900 text-gray-900 font-mono text-xs sm:text-sm rounded py-3 px-4 pr-16 sm:pr-24 overflow-x-auto select-all max-w-full">
                <span className="text-gray-400 select-none">$ </span>
                {command}
            </pre>
            <button
                className="absolute top-2.5 right-2 px-2 py-1 border bg-white border-gray-800 hover:bg-muted text-xs text-gray-900 hover:text-foreground rounded focus:outline-none active:bg-muted cursor-pointer transition"
                onClick={handleCopy}
                aria-label="Copy to clipboard"
            >
                {copied ? "Copied!" : "Copy"}
            </button>
        </div>
    );
}
