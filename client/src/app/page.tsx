import Hero from "../components/home/Hero";
import IngredientsStrip from "../components/home/IngredientsStrip";
import BrandPromise from "@/components/home/BrandPromise";
import ProductsGrid from "../components/home/ProductGrid";
import BenefitsStrip from "../components/home/BenifitsStrip";
import RootedReads from "@/components/home/RootedReads";
// import BrewRitualsBanner from "@/components/home/BrewRitualsBanner";
import ExpertTalks from "@/components/home/ExpertTalks";
import InstagramReels from "@/components/home/InstagramReels";
import Testimonials from "@/components/home/Testimonial";


import OfferStrip from "../components/layout/OfferStrip";

export default function HomePage() {
return (
<main>
<Hero />
<OfferStrip stripNumber={2} />
<IngredientsStrip />
<BrandPromise />
<ProductsGrid />
<BenefitsStrip />
<RootedReads />
{/* <BrewRitualsBanner /> */}
<ExpertTalks />
<Testimonials />
<InstagramReels />
</main>
);
}