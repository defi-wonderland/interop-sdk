"use client";

import { AudienceSection } from "@/components/audience-section";
import { ContributorsSection } from "@/components/contributors-section";
import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { Navbar } from "@/components/navbar";
import { PrinciplesSection } from "@/components/principles-section";
import { SolutionsSection } from "@/components/solutions-section";
import { useState } from "react";

export default function Home() {
    const [showNavbar, setShowNavbar] = useState(false);

    return (
        <main className="min-h-screen">
            <Navbar visible={showNavbar} />
            <HeroSection onScrollPastHero={setShowNavbar} />
            <PrinciplesSection />
            <SolutionsSection />
            <AudienceSection />
            <ContributorsSection />
            <CtaSection />
            <Footer />
        </main>
    );
}
