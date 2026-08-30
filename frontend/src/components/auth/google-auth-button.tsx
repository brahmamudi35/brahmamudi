"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { FieldSeparator } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";
import type { ApiError } from "@/lib/types";

const enabled = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleAuthButton({ text = "continue_with" }: { text?: "signin_with" | "signup_with" | "continue_with" }) {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [busy, setBusy] = useState(false);

  if (!enabled) return null;

  return (
    <div className="space-y-4">
      <FieldSeparator>or</FieldSeparator>
      <div className="flex min-h-10 justify-center">
        {busy ? (
          <Spinner className="size-5 text-primary" />
        ) : (
          <GoogleLogin
            text={text}
            shape="pill"
            width="320"
            theme={resolvedTheme === "dark" ? "filled_black" : "outline"}
            onSuccess={async (res) => {
              if (!res.credential) return;
              setBusy(true);
              try {
                const data = await loginWithGoogle(res.credential);
                const nextParam = new URLSearchParams(
                  window.location.search,
                ).get("next");
                const next =
                  nextParam ||
                  (data.created || !data.user.has_profile
                    ? "/onboarding"
                    : "/dashboard");
                router.replace(next);
              } catch (err) {
                setBusy(false);
                toast.error((err as ApiError)?.detail ?? "Google sign-in failed.");
              }
            }}
            onError={() => toast.error("Google sign-in was cancelled.")}
          />
        )}
      </div>
    </div>
  );
}
