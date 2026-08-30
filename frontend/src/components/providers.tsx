"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export function Providers({ children }: { children: React.ReactNode }) {
  const tree = (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>{children}</AuthProvider>
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  );

  return googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>
  ) : (
    tree
  );
}
