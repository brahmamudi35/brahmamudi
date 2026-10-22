import type { MetadataRoute } from "next";

const SITE = "https://brahmamudi.com";

// Member and staff pages sit behind login; keep crawlers on the public ones.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account", "/admin", "/dashboard", "/interests", "/matches", "/membership",
        "/notifications", "/onboarding", "/payment", "/profile", "/profiles",
        "/saved-searches", "/search", "/shortlist", "/visitors",
        "/reset-password", "/verify-email",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
