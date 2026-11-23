import type { MetadataRoute } from "next";
import { getAllPlaces } from "@/lib/data";

export const dynamic = "force-static";

const BASE_URL = "https://hangout-vn.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/explore`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/random`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/map`, changeFrequency: "weekly", priority: 0.8 },
  ];

  const placeRoutes: MetadataRoute.Sitemap = getAllPlaces().map((place) => ({
    url: `${BASE_URL}/places/${place.id}`,
    changeFrequency: "monthly",
    priority: place.featured ? 0.75 : 0.6,
  }));

  return [...staticRoutes, ...placeRoutes];
}
