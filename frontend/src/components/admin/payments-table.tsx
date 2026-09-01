"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import type { ModerationPayment, Paginated } from "@/lib/types";
import { cn } from "@/lib/utils";

const fieldCls =
  "h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:border-ring";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  pending: "secondary",
  initiated: "outline",
  failure: "destructive",
  cancelled: "outline",
  refunded: "secondary",
};

const PAGE = 25;

export function PaymentsTable({ profileId }: { profileId?: number }) {
  const [rows, setRows] = useState<ModerationPayment[] | null>(null);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ limit: String(PAGE) });
    if (profileId) p.set("profile", String(profileId));
    if (status) p.set("status", status);
    if (debounced) p.set("search", debounced);
    return p.toString();
  }, [profileId, status, debounced]);

  const fetchPage = useCallback(
    (offset: number) => {
      const p = new URLSearchParams(query);
      p.set("offset", String(offset));
      if (offset === 0) queueMicrotask(() => setRows(null));
      apiFetch<Paginated<ModerationPayment>>(`/moderation/payments/?${p}`)
        .then((d) => {
          setCount(d.count);
          setRows((prev) => (offset === 0 ? d.results : [...(prev ?? []), ...d.results]));
        })
        .catch(handleApiError)
        .finally(() => setLoadingMore(false));
    },
    [query],
  );

  useEffect(() => fetchPage(0), [fetchPage]);

  return (
    <div className="space-y-3">
      {!profileId && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Txn id, PayU id, email, phone, reg. no…"
              className={cn(fieldCls, "w-full pl-8")}
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={fieldCls}
          >
            <option value="">Any status</option>
            {["success", "pending", "initiated", "failure", "cancelled", "refunded"].map(
              (s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      {!rows ? (
        <Spinner className="text-primary" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No payments found.
        </p>
      ) : (
        <>
          {!profileId && (
            <p className="text-xs text-muted-foreground">
              {count.toLocaleString()} payment{count === 1 ? "" : "s"}
            </p>
          )}
          <div className="space-y-2">
            {rows.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
                  <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>
                    {p.status}
                  </Badge>
                  <span className="font-medium">
                    ₹{Number(p.amount).toLocaleString("en-IN")}
                  </span>
                  <span className="text-muted-foreground">{p.plan ?? "—"}</span>
                  {!profileId && (
                    <span className="min-w-0 truncate">
                      {p.profile_id ? (
                        <Link
                          href={`/admin/members/${p.profile_id}`}
                          className="hover:underline"
                        >
                          {p.profile_name || p.regno || "—"}
                        </Link>
                      ) : (
                        (p.email || "—")
                      )}
                    </span>
                  )}
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {p.txnid.slice(0, 12)}…
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  {p.is_legacy && <Badge variant="outline">legacy</Badge>}
                  {p.error_message && (
                    <span className="w-full text-xs text-destructive">
                      {p.error_message}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {rows.length < count && (
            <Button
              variant="outline"
              className="w-full"
              disabled={loadingMore}
              onClick={() => {
                setLoadingMore(true);
                fetchPage(rows.length);
              }}
            >
              {loadingMore ? <Spinner /> : `Load more (${count - rows.length} left)`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
