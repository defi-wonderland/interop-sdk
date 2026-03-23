"use client";

import { AudienceSection } from "@/components/audience-section";
import { ContributorsSection } from "@/components/contributors-section";
import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { Navbar } from "@/components/navbar";
import { PrinciplesSection } from "@/components/principles-section";
import { SolutionsSection } from "@/components/solutions-section";

export default function Home() {
    return (
        <main className="min-h-screen">
            <Navbar />
            <HeroSection />
            <PrinciplesSection />
            <AudienceSection />
            <SolutionsSection />
            <ContributorsSection />
            <CtaSection />
            <Footer />
        </main>
    );
}
