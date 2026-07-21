import Hero from "@/components/Hero";
import CraftSection from "@/components/CraftSection";
import CollectieSection from "@/components/CollectieSection";
import ProcesSection from "@/components/ProcesSection";
import ContactSection from "@/components/ContactSection";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <CraftSection />
      <CollectieSection />
      <ProcesSection />
      <ContactSection />
    </main>
  );
}
