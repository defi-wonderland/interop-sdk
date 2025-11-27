"use client";

import { DemoSection } from "@/components/demo-section";
import { FaqSection } from "@/components/faq-section";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { LogosSection } from "@/components/logos-section";
import { ProblemsSection } from "@/components/problems-section";
import { SdkSection } from "@/components/sdk-section";
import { SpecsSection } from "@/components/specs-section";
import { Dithering } from "@paper-design/shaders-react";

export default function Home() {
    return (
        <main className="min-h-screen">
            <nav className="fixed left-0 top-0 w-full lg:hidden z-10 bg-white border-b border-gray-200">
                <div className="flex flex-col items-center py-4 px-6">
                    <h1 className="font-mono text-base font-semibold text-[oklch(0.22_0.11_269.06)] text-center mb-2">
                        Interoperable Addresses
                    </h1>
                    <div className="flex justify-center gap-3 font-mono text-xs text-[oklch(0.22_0.11_269.06)]">
                        <a
                            href="https://interop.wonderland.xyz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[#3441C0] transition-colors font-semibold"
                        >
                            Demo ↗
                        </a>
                        <span className="text-muted-foreground">|</span>
                        <a href="#specs" className="hover:text-[#3441C0] transition-colors">
                            Specs
                        </a>
                        <span className="text-muted-foreground">|</span>
                        <a href="#sdk" className="hover:text-[#3441C0] transition-colors">
                            SDK
                        </a>
                        <span className="text-muted-foreground">|</span>
                        <a href="#faq" className="hover:text-[#3441C0] transition-colors">
                            FAQ
                        </a>
                    </div>
                </div>
            </nav>

            <div className="hidden lg:block fixed left-0 top-0 w-2/5 h-screen overflow-hidden z-0">
                <Dithering
                    width={1920}
                    height={1080}
                    colorBack="#1a1f4d"
                    colorFront="#ffffff"
                    shape="simplex"
                    type="4x4"
                    size={2.5}
                    speed={0.5}
                />
            </div>

            <div className="pt-20 lg:pt-0 lg:ml-[40%] lg:w-[60%]">
                <HeroSection />
                <LogosSection />
                <ProblemsSection />
                <HowItWorksSection />
                <SpecsSection />
                <DemoSection />
                <SdkSection />
                <FaqSection />
                <Footer />
            </div>
        </main>
    );
}
