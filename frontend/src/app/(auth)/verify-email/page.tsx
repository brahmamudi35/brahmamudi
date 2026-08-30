"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type State = "verifying" | "ok" | "error";

function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get("token");
  const { user, refreshUser } = useAuth();
  const [state, setState] = useState<State>("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState("error");
      setMessage("This link is missing its verification token.");
      return;
    }
    apiFetch<{ detail: string }>("/auth/email/verify/", {
      method: "POST",
      auth: false,
      body: { token },
    })
      .then(async () => {
        setState("ok");
        await refreshUser();
      })
      .catch((e: { detail?: string }) => {
        setState("error");
        setMessage(e?.detail ?? "This verification link is invalid or expired.");
      });
  }, [token, refreshUser]);

  return (
    <Card>
      <CardHeader className="items-center text-center">
        {state === "verifying" && <Spinner className="size-8 text-primary" />}
        {state === "ok" && (
          <CheckCircle2 className="size-10 text-primary" />
        )}
        {state === "error" && <XCircle className="size-10 text-destructive" />}
        <CardTitle className="font-heading text-2xl">
          {state === "verifying" && "Verifying your email…"}
          {state === "ok" && "Email verified"}
          {state === "error" && "Couldn't verify"}
        </CardTitle>
        <CardDescription>
          {state === "ok" &&
            "Your email address is confirmed. You're all set."}
          {state === "error" && message}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {state === "ok" && (
          <Button render={<Link href={user ? "/dashboard" : "/login"} />}>
            {user ? "Go to dashboard" : "Sign in"}
          </Button>
        )}
        {state === "error" && <ResendButton />}
      </CardContent>
    </Card>
  );
}

function ResendButton() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    try {
      await apiFetch("/auth/email/verify/resend/", {
        method: "POST",
        auth: false,
        body: { email },
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        If that address needs verifying, a new link is on its way.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="h-9 rounded-md border bg-background px-3 text-sm"
      />
      <Button variant="outline" onClick={resend} disabled={busy || !email}>
        {busy && <Spinner />}
        Resend verification email
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
