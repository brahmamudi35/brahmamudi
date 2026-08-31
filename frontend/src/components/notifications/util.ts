import {
  BadgeCheck,
  Bell,
  Eye,
  Heart,
  ImageOff,
  ImageUp,
  Sparkles,
  X,
} from "lucide-react";

import type { NotificationKind } from "@/lib/types";

export function notificationIcon(kind: NotificationKind) {
  switch (kind) {
    case "interest_received":
    case "interest_accepted":
      return Heart;
    case "interest_declined":
      return X;
    case "profile_view":
      return Eye;
    case "profile_verified":
      return BadgeCheck;
    case "photo_approved":
      return ImageUp;
    case "photo_rejected":
      return ImageOff;
    case "subscription_activated":
      return Sparkles;
    case "search_alert":
      return Sparkles;
    default:
      return Bell;
  }
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
