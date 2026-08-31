"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Eye,
  Heart,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { apiFetch } from "@/lib/api";

import { Container } from "@/components/site/container";
import { Logo } from "@/components/site/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/matches", label: "Matches", icon: Sparkles },
  { href: "/search", label: "Search", icon: Search },
  { href: "/interests", label: "Interests", icon: Heart },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/shortlist", label: "Shortlist", icon: Star },
  { href: "/visitors", label: "Visitors", icon: Eye },
];

export function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const poll = () =>
      apiFetch<{ unread: number }>("/conversations/unread-count/")
        .then((d) => setUnread(d.unread))
        .catch(() => {});
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, [user, pathname]);

  const navLink = (href: string, label: string, Icon: typeof Search) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className="size-4" />
        {label}
        {href === "/messages" && unread > 0 && (
          <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {unread}
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => navLink(n.href, n.label, n.icon))}
            {navLink("/membership", "Membership", Sparkles)}
            {user?.is_staff && navLink("/admin", "Moderation", ShieldCheck)}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="hidden size-4 dark:block" />
            <Moon className="size-4 dark:hidden" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <UserIcon className="size-4" />
              <span className="hidden sm:inline">
                {user?.full_name?.split(" ")[0] || user?.email.split("@")[0]}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/onboarding")}>
                Edit profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/profile/photos")}>
                Photos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/account")}>
                Account &amp; password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "md:hidden",
              )}
              aria-label="Menu"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>
                  <Logo href="/dashboard" />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1 px-2">
                {NAV.map((n) => navLink(n.href, n.label, n.icon))}
                {navLink("/membership", "Membership", Sparkles)}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
