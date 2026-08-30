import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "brahmamudi";

export const metadata: Metadata = {
  title: {
    default: `${siteName} — Vishwabrahmin Matrimony`,
    template: `%s — ${siteName}`,
  },
  description:
    "Trusted matchmaking for the Vishwabrahmin (Vishwakarma) community — verified profiles, horoscope details, and family-first matches.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
