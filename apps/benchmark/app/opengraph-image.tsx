import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Cross-chain bridge benchmark — Across, Relay, LiFi and Bungee on speed, fees and success rate';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand tokens (mirrors app/globals.css light theme; next/og can't read CSS vars).
const BACKGROUND = '#dee3eb';
const SURFACE = '#e5eaf1';
const BORDER = '#b6bfcc';
const ACCENT = '#1a3a5c';
const TEXT_PRIMARY = '#1b1b1f';
const TEXT_SECONDARY = '#52596a';
const TEXT_MUTED = '#5c6271';
const SUCCESS = '#3b7a48';

const PROVIDERS = [
  { name: 'Across', color: '#b84826' },
  { name: 'Relay', color: '#5e419e' },
  { name: 'LiFi', color: '#1f695f' },
  { name: 'Bungee', color: '#9e2a65' },
];

function loadFont(file: string): Promise<Buffer> {
  // Resolved at build time (the OG image is statically generated): cwd is the
  // benchmark package root when Next builds it.
  return readFile(join(process.cwd(), 'app/assets/fonts', file));
}

export default async function Image() {
  const [geistSemiBold, geistMono] = await Promise.all([
    loadFont('Geist-SemiBold.ttf'),
    loadFont('GeistMono-Regular.ttf'),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: BACKGROUND, padding: 40 }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            padding: '56px 64px',
            fontFamily: 'Geist Mono',
          }}
        >
          {/* header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: 3, color: ACCENT }}>WONDERLAND</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 9, height: 9, borderRadius: 5, background: SUCCESS }} />
              <span style={{ fontSize: 16, letterSpacing: 3, color: TEXT_SECONDARY }}>LIVE BENCHMARK</span>
            </div>
          </div>

          {/* headline */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 18, letterSpacing: 4, color: TEXT_SECONDARY, marginBottom: 22 }}>
              CROSS-CHAIN QUOTE RACE
            </span>
            <span
              style={{
                fontFamily: 'Geist',
                fontSize: 64,
                fontWeight: 600,
                lineHeight: 1.05,
                color: TEXT_PRIMARY,
                maxWidth: 920,
              }}
            >
              Bridge providers, one question, four answers.
            </span>
            <div style={{ display: 'flex', width: 360, height: 4, marginTop: 28 }}>
              {PROVIDERS.map((p) => (
                <div key={p.name} style={{ flex: 1, background: p.color }} />
              ))}
            </div>
            <span style={{ fontSize: 24, color: TEXT_SECONDARY, marginTop: 24 }}>
              Across · Relay · LiFi · Bungee — speed, fee %, success rate
            </span>
          </div>

          {/* footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 28 }}>
              {PROVIDERS.map((p) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 7, background: p.color }} />
                  <span style={{ fontSize: 20, fontWeight: 500, color: TEXT_PRIMARY }}>{p.name}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 18, color: TEXT_SECONDARY }}>benchmark.interop.wonderland.xyz</span>
              <span style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 6 }}>
                powered by @wonderland/interop-cross-chain
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Geist', data: geistSemiBold, weight: 600, style: 'normal' },
        { name: 'Geist Mono', data: geistMono, weight: 400, style: 'normal' },
      ],
    },
  );
}
