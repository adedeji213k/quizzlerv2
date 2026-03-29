import Image from "next/image";
import Navbar from "./components/NavBar";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";
import SchoolCarousel from "./components/SchoolCarousel";
import Testimonials from "./components/Testimonials";
import PartnerPromo from "./components/PartnerPromo";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <FeaturesSection />
        <SchoolCarousel />
        <Testimonials />
        <PartnerPromo />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
