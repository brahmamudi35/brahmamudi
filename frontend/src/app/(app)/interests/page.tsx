"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Inbox, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import type { Interest, Paginated, ProfileSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<Interest["status"], string> = {
  sent: "text-amber-600",
  accepted: "text-emerald-600",
  declined: "text-muted-foreground",
  withdrawn: "text-muted-foreground",
};

export default function InterestsPage() {
  const [box, setBox] = useState<"received" | "sent">("received");
  const [items, setItems] = useState<Interest[] | null>(null);

  const load = useCallback(() => {
    apiFetch<Paginated<Interest>>(`/interests/?box=${box}`)
      .then((d) => setItems(d.results))
      .catch(() => setItems([]));
  }, [box]);

  useEffect(load, [load]);

  const loading = items === null;

  async function respond(id: number, action: "accept" | "decline") {
    try {
      await apiFetch(`/interests/${id}/${action}/`, { method: "POST" });
      toast.success(action === "accept" ? "Interest accepted." : "Interest declined.");
      load();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function withdraw(id: number) {
    try {
      await apiFetch(`/interests/${id}/withdraw/`, { method: "POST" });
      load();
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <Container className="max-w-3xl py-6">
      <h1 className="font-heading text-2xl font-semibold">Interests</h1>

      <Tabs
        value={box}
        onValueChange={(v) => setBox(v as "received" | "sent")}
        className="mt-4"
      >
        <TabsList>
          <TabsTrigger value="received">
            <Inbox className="size-4" />
            Received
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="size-4" />
            Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value={box} className="mt-4 space-y-3">
          {loading || !items ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              {box === "received"
                ? "No one has expressed interest yet."
                : "You haven't sent any interests yet."}
            </p>
          ) : (
            items.map((it) => {
              const person =
                box === "received" ? it.sender_detail : it.receiver_detail;
              return (
                <Card key={it.id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <PersonThumb person={person} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/profiles/${person.id}`}
                          className="truncate font-medium hover:underline"
                        >
                          {person.first_name}
                        </Link>
                        <Badge
                          variant="outline"
                          className={cn("capitalize", STATUS_STYLE[it.status])}
                        >
                          {it.status}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {it.message ||
                          `${person.age ?? ""} ${person.age ? "yrs · " : ""}${person.subcaste}`}
                      </p>
                    </div>

                    {box === "received" && it.status === "sent" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => respond(it.id, "accept")}>
                          <Check className="size-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => respond(it.id, "decline")}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )}
                    {box === "sent" && it.status === "sent" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => withdraw(it.id)}
                      >
                        Withdraw
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </Container>
  );
}

function PersonThumb({ person }: { person: ProfileSummary }) {
  return (
    <div className="size-14 shrink-0 overflow-hidden rounded-full bg-muted">
      {person.primary_photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.primary_photo} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center font-heading text-lg text-primary/40">
          {person.first_name?.[0]}
        </div>
      )}
    </div>
  );
}
