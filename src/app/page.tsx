import {
  getAllCategories,
  getAllPlaces,
  getAllProvinces,
  getFeaturedPlaces,
} from "@/lib/data";
import { HomeExperience } from "@/components/home/HomeExperience";

export default function HomePage() {
  const featuredPlaces = getFeaturedPlaces(8);
  const categories = getAllCategories();
  const provinces = getAllProvinces();
  const totalPlaces = getAllPlaces().length;

  return (
    <HomeExperience
      featuredPlaces={featuredPlaces}
      categories={categories}
      provinces={provinces}
      totalPlaces={totalPlaces}
    />
  );
}
