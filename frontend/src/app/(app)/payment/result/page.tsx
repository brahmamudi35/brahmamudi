"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function Result() {
  const params = useSearchParams();
  const status = params.get("status") ?? "unknown";
  const success = status === "success";
  const pending = status === "pending";

  const Icon = success ? CheckCircle2 : pending ? Clock : XCircle;
  const tone = success
    ? "text-emerald-600"
    : pending
      ? "text-amber-600"
      : "text-destructive";

  return (
    <Container className="flex max-w-md flex-col items-center py-20 text-center">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <Icon className={`size-12 ${tone}`} />
          <h1 className="font-heading text-2xl font-semibold">
            {success
              ? "Payment successful"
              : pending
                ? "Payment pending"
                : "Payment not completed"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {success
              ? "Your membership is now active. It may take a moment to reflect."
              : pending
                ? "We're waiting for confirmation from the bank. We'll email you when it clears."
                : "The payment was cancelled or failed. You have not been charged."}
          </p>
          <div className="mt-2 flex gap-2">
            <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
            {!success && (
              <Button variant="outline" render={<Link href="/membership" />}>
                Try again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={null}>
      <Result />
    </Suspense>
  );
}
