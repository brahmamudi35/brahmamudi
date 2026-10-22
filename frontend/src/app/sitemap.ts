import type { MetadataRoute } from "next";

const SITE = "https://brahmamudi.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number][] = [
    ["", 1], ["/register", 0.9], ["/pricing", 0.8], ["/about", 0.7], ["/contact", 0.7],
    ["/login", 0.5], ["/terms", 0.3], ["/privacy", 0.3], ["/refund-policy", 0.3],
  ];
  return pages.map(([path, priority]) => ({ url: `${SITE}${path}`, priority }));
}
