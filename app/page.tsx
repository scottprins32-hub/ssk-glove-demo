import Hero from "@/components/Hero";
import CraftSection from "@/components/CraftSection";
import CollectieSection from "@/components/CollectieSection";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <CraftSection />
      <CollectieSection />
      {/* §4 Proces · §5 Contact — per BRIEF.md */}
    </main>
  );
}
