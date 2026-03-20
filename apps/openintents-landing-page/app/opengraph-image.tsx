import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Open Intents - Cross-chain UX for Ethereum";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: "#1e1a2e",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "monospace",
                }}
            >
                {/* Tent logo as inline SVG */}
                <svg width="120" height="82" viewBox="332 92 400 275" fill="none">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M482 92H457V142H432V192H407V242H382V292H357V342H332V367H732V342H707V292H682V242H657V192H632V142H607V92H582V117H482V92ZM509 142H607V192H632V242H657V292H682V342H584V292H559V242H534V192H509V142ZM484 192H509V242H534V292H559V342H532V317H507V267H483V217H458V267H433V317H408V342H382V292H407V242H432V192H457V142H484V192ZM433 317V342H507V317H482V267H458V317H433Z"
                        fill="#8b7cc8"
                    />
                </svg>

                <div
                    style={{
                        display: "flex",
                        fontSize: 64,
                        fontWeight: 300,
                        color: "#e8e4f0",
                        marginTop: 32,
                    }}
                >
                    Open Intents
                </div>

                <div
                    style={{
                        display: "flex",
                        position: "absolute",
                        bottom: 40,
                        fontSize: 16,
                        color: "#635e70",
                    }}
                >
                    openintents.xyz
                </div>
            </div>
        ),
        {
            ...size,
        },
    );
}
