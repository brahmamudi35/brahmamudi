"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { SiteHeader } from "@/components/site/site-header";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-muted/20">{children}</main>
    </>
  );
}
