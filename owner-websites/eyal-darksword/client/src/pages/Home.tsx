import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import MarqueeBar from "@/components/MarqueeBar";
import ProductCarousel from "@/components/ProductCarousel";
import CraftsmanSection from "@/components/CraftsmanSection";
import SpecsSection from "@/components/SpecsSection";
import BrandStory from "@/components/BrandStory";
import BundleSection from "@/components/BundleSection";
import CategoryShowcase from "@/components/CategoryShowcase";
import ReviewsSection from "@/components/ReviewsSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AnnouncementBar />
      <Header />
      <main>
        <HeroSection />
        <MarqueeBar />
        <ProductCarousel />
        <CraftsmanSection />
        <SpecsSection />
        <BrandStory />
        <MarqueeBar variant="secondary" />
        <BundleSection />
        <CategoryShowcase />
        <ReviewsSection />
      </main>
      <Footer />
    </div>
  );
}
