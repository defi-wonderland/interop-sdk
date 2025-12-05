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
import { useEffect, useState } from "react";

export default function Home() {
    const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });

    useEffect(() => {
        const updateCanvasSize = () => {
            setCanvasSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        // Set initial size
        updateCanvasSize();

        // Update on resize
        window.addEventListener("resize", updateCanvasSize);
        return () => {
            window.removeEventListener("resize", updateCanvasSize);
        };
    }, []);

    return (
        <main className="min-h-screen">
            <MobileNavbar />

            <div className="hidden lg:block fixed left-0 top-0 w-2/5 h-screen overflow-hidden z-0">
                <Dithering
                    width={canvasSize.width}
                    height={canvasSize.height}
                    colorBack="#1a1f4d"
                    colorFront="#ffffff"
                    shape="simplex"
                    type="4x4"
                    size={2.5}
                    speed={0.5}
                />
            </div>

            <div className="lg:ml-[40%] lg:w-[60%] lg:max-w-[1400px]">
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
