import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  withWordmark = true,
}: {
  className?: string;
  href?: string;
  withWordmark?: boolean;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)}>
      {withWordmark ? (
        <Image
          src="/images/brahmamudi-logo-full.png"
          alt="Brahmamudi.com — A vishwabrahmana Vivaha Seva Samiti"
          width={323}
          height={63}
          priority
          className="h-14 w-auto object-contain"
        />
      ) : (
        <Mark className="size-7" />
      )}
    </Link>
  );
}

/** The brahmamudi flame mark, from the original brahmamudi.com logo. */
export function Mark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/brahmamudi-flame.png"
      alt=""
      width={50}
      height={59}
      className={cn("object-contain", className)}
    />
  );
}
