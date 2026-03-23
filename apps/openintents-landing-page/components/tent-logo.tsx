import { cn } from "@/lib/utils";

interface TentLogoProps {
    className?: string;
    size?: number;
}

/**
 * Pixel-art tent logo from the official OIF branding SVG.
 * Uses evenodd fill rule for the door/opening cutout.
 */
export function TentLogo({ className, size = 80 }: TentLogoProps) {
    const h = size * (275 / 400);

    return (
        <svg
            width={size}
            height={h}
            viewBox="332 92 400 275"
            fill="none"
            className={cn("text-accent", className)}
            aria-hidden="true"
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M482 92H457V142H432V192H407V242H382V292H357V342H332V367H732V342H707V292H682V242H657V192H632V142H607V92H582V117H482V92ZM509 142H607V192H632V242H657V292H682V342H584V292H559V242H534V192H509V142ZM484 192H509V242H534V292H559V342H532V317H507V267H483V217H458V267H433V317H408V342H382V292H407V242H432V192H457V142H484V192ZM433 317V342H507V317H482V267H458V317H433Z"
                fill="currentColor"
            />
        </svg>
    );
}
