"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  notificationIcon,
  timeAgo,
} from "@/components/notifications/util";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import type { Notification, Paginated } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Notification[] | null>(null);
  const [count, setCount] = useState(0);
  const [more, setMore] = useState(false);

  const load = useCallback((offset = 0) => {
    if (offset === 0) setRows(null);
    else setMore(true);
    apiFetch<Paginated<Notification>>(`/notifications/?limit=30&offset=${offset}`)
      .then((d) => {
        setCount(d.count);
        setRows((prev) => (offset === 0 ? d.results : [...(prev ?? []), ...d.results]));
      })
      .catch(() => setRows([]))
      .finally(() => setMore(false));
  }, []);

  useEffect(() => load(0), [load]);

  async function markAll() {
    await apiFetch("/notifications/read/", { method: "POST", body: {} }).catch(() => {});
    setRows((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
  }

  function open(n: Notification) {
    if (!n.read) {
      apiFetch("/notifications/read/", { method: "POST", body: { ids: [n.id] } }).catch(
        () => {},
      );
      setRows((p) => p?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
    }
    if (n.url) router.push(n.url);
  }

  const hasUnread = rows?.some((n) => !n.read);

  return (
    <Container className="max-w-2xl py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Notifications</h1>
        {hasUnread && (
          <Button variant="ghost" size="sm" onClick={markAll}>
            Mark all read
          </Button>
        )}
      </div>

      {!rows ? (
        <div className="mt-8 flex justify-center">
          <Spinner className="text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">
          You have no notifications yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y rounded-xl border">
          {rows.map((n) => {
            const Icon = notificationIcon(n.kind);
            return (
              <li key={n.id}>
                <button
                  onClick={() => open(n)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{n.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                  {!n.read && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {rows && rows.length < count && (
        <Button
          variant="outline"
          className="mt-4 w-full"
          disabled={more}
          onClick={() => load(rows.length)}
        >
          {more ? <Spinner /> : "Load more"}
        </Button>
      )}
    </Container>
  );
}
