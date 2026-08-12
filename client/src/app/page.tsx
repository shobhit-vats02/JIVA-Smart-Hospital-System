'use client';

import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Stats } from '@/components/landing/Stats';
import { Features } from '@/components/landing/Features';
import { AISection } from '@/components/landing/AISection';
import { VideoSection } from '@/components/landing/VideoSection';
import { EmergencySection } from '@/components/landing/EmergencySection';
import { HospitalNetwork } from '@/components/landing/HospitalNetwork';
import { Contact } from '@/components/landing/Contact';
import { Footer } from '@/components/landing/Footer';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

export default function HomePage() {
  return (
    <main id="main-content" className="relative min-h-screen">
      <AnimatedBackground />
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <AISection />
      <VideoSection />
      <EmergencySection />
      <HospitalNetwork />
      <Contact />
      <Footer />
    </main>
  );
}
