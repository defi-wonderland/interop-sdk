"use client";

import { DemoSection } from "@/components/demo-section";
import { FaqSection } from "@/components/faq-section";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { LogosSection } from "@/components/logos-section";
import { MobileNavbar } from "@/components/mobile-navbar";
import { ProblemsSection } from "@/components/problems-section";
import { SdkSection } from "@/components/sdk-section";
import { SpecsSection } from "@/components/specs-section";
import { Dithering } from "@paper-design/shaders-react";

export default function Home() {
    return (
        <main className="min-h-screen">
            <MobileNavbar />

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

            <div className="lg:ml-[40%] lg:w-[60%]">
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
