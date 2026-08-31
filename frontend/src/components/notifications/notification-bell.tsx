"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Notification, Paginated } from "@/lib/types";
import { cn } from "@/lib/utils";
import { notificationIcon, timeAgo } from "./util";

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[] | null>(null);

  const poll = useCallback(() => {
    apiFetch<{ unread: number }>("/notifications/unread-count/")
      .then((d) => setUnread(d.unread))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    poll();
    const t = setInterval(poll, 45000);
    return () => clearInterval(t);
  }, [user, poll]);

  function onOpen(open: boolean) {
    if (!open) return;
    apiFetch<Paginated<Notification>>("/notifications/?limit=8")
      .then((d) => setItems(d.results))
      .catch(() => setItems([]));
  }

  async function markAll() {
    await apiFetch("/notifications/read/", { method: "POST", body: {} }).catch(() => {});
    setUnread(0);
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
  }

  function open(n: Notification) {
    if (!n.read) {
      apiFetch("/notifications/read/", { method: "POST", body: { ids: [n.id] } }).catch(
        () => {},
      );
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.url) router.push(n.url);
  }

  if (!user) return null;

  return (
    <DropdownMenu onOpenChange={onOpen}>
      <DropdownMenuTrigger
        aria-label="Notifications"
        className="relative inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && (
            <button
              onClick={markAll}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />

        {items === null ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nothing yet.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((n) => {
              const Icon = notificationIcon(n.kind);
              return (
                <button
                  key={n.id}
                  onClick={() => open(n)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted/60",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">{n.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                  {!n.read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        )}

        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          className="justify-center text-primary"
          render={<Link href="/notifications" />}
        >
          See all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
