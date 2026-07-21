import Hero from "@/components/Hero";
import CraftSection from "@/components/CraftSection";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <CraftSection />
      {/* §3 Collectie · §4 Proces · §5 Contact — one section per prompt, per BRIEF.md */}
    </main>
  );
}
