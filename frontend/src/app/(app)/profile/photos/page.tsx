"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { HoroscopeManager } from "@/components/onboarding/horoscope-manager";
import { PhotoManager } from "@/components/onboarding/photo-manager";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PhotosPage() {
  return (
    <Container className="max-w-2xl py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        render={<Link href="/dashboard" />}
      >
        <ArrowLeft className="size-4" />
        Dashboard
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Your photos</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoManager />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Horoscope</CardTitle>
        </CardHeader>
        <CardContent>
          <HoroscopeManager />
        </CardContent>
      </Card>
    </Container>
  );
}
