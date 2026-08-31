"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, SendHorizonal } from "lucide-react";

import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import type { ApiError, Conversation, Message, Paginated } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>
  );
}

function MessagesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const withProfile = params.get("with");
  const activeId = params.get("c");

  const [convos, setConvos] = useState<Conversation[] | null>(null);

  const loadConvos = useCallback(() => {
    apiFetch<Paginated<Conversation>>("/conversations/")
      .then((d) => setConvos(d.results))
      .catch(() => setConvos([]));
  }, []);

  useEffect(loadConvos, [loadConvos]);
  useEffect(() => {
    const t = setInterval(loadConvos, 20000);
    return () => clearInterval(t);
  }, [loadConvos]);

  // ?with=<profileId> -> open (creating if needed) then swap to ?c=<id>
  useEffect(() => {
    if (!withProfile) return;
    apiFetch<Conversation>("/conversations/", {
      method: "POST",
      body: { profile: Number(withProfile) },
    })
      .then((c) => router.replace(`/messages?c=${c.id}`))
      .catch((e: ApiError) => {
        handleApiError(e);
        router.replace("/messages");
      });
  }, [withProfile, router]);

  const active = convos?.find((c) => String(c.id) === activeId) ?? null;

  return (
    <Container className="py-6">
      <h1 className="font-heading text-2xl font-semibold">Messages</h1>

      <div className="mt-4 grid gap-4 md:grid-cols-[300px_1fr]">
        <aside
          className={cn(
            "space-y-1 md:block",
            activeId ? "hidden" : "block",
          )}
        >
          {!convos ? (
            <Spinner className="text-primary" />
          ) : convos.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No conversations yet. They start once someone accepts your interest
              and you have a plan with messaging.
            </p>
          ) : (
            convos.map((c) => (
              <Link
                key={c.id}
                href={`/messages?c=${c.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
                  String(c.id) === activeId && "border-primary bg-primary/5",
                )}
              >
                <Thumb src={c.other.primary_photo} name={c.other.first_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">
                      {c.other.first_name}
                    </span>
                    {c.unread > 0 && (
                      <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.last_message?.body ?? "No messages yet"}
                  </p>
                </div>
              </Link>
            ))
          )}
        </aside>

        <section className={cn("md:block", activeId ? "block" : "hidden")}>
          {active ? (
            <Thread conversation={active} onSent={loadConvos} />
          ) : (
            <div className="hidden h-full items-center justify-center rounded-xl border text-sm text-muted-foreground md:flex">
              Select a conversation
            </div>
          )}
        </section>
      </div>
    </Container>
  );
}

function Thread({
  conversation,
  onSent,
}: {
  conversation: Conversation;
  onSent: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const id = conversation.id;

  const load = useCallback(() => {
    apiFetch<Paginated<Message>>(`/conversations/${id}/messages/?limit=200`)
      .then((d) => setMessages(d.results))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await apiFetch(`/conversations/${id}/messages/`, {
        method: "POST",
        body: { body },
      });
      setText("");
      load();
      onSent();
    } catch (err) {
      handleApiError(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border">
      <div className="flex items-center gap-3 border-b p-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          render={<Link href="/messages" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Thumb
          src={conversation.other.primary_photo}
          name={conversation.other.first_name}
        />
        <Link
          href={`/profiles/${conversation.other.id}`}
          className="font-medium hover:underline"
        >
          {conversation.other.first_name}
        </Link>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.sender !== conversation.other.id;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Write a message…"
          className="max-h-32 min-h-10 resize-none"
        />
        <Button onClick={send} disabled={sending || !text.trim()} size="icon">
          {sending ? <Spinner /> : <SendHorizonal className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function Thumb({ src, name }: { src: string | null; name: string }) {
  return (
    <div className="size-10 shrink-0 overflow-hidden rounded-full bg-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center font-heading text-primary/40">
          {name?.[0]}
        </div>
      )}
    </div>
  );
}
