"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppHeader } from "@/components/site/app-header";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signedOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // after an explicit sign-out the caller is already navigating away
    if (!loading && !user && !signedOut) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, signedOut, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-muted/20">{children}</main>
    </>
  );
}
