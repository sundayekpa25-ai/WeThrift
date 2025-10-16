import { Suspense } from 'react';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { ChannelsSection } from '@/components/landing/channels-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { CTASection } from '@/components/landing/cta-section';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Suspense fallback={<LoadingSpinner />}>
          <HeroSection />
        </Suspense>
        <FeaturesSection />
        <HowItWorksSection />
        <ChannelsSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
