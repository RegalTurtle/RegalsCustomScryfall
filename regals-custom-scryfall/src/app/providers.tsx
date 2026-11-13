"use client";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function AccountBoundary({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const privatePage = /^\/(decks|collection|games)(\/|$)/.test(pathname);
  const id = session?.user?.id;
  useEffect(() => {
    if (privatePage && status !== "loading" && !id) router.replace("/login");
  }, [privatePage, status, id, router]);
  // Unmount all personal component state during logout/account changes. Pending
  // requests can only update their old, unmounted component instances.
  if (privatePage && (status === "loading" || !id)) return <p>Loading…</p>;
  return <div key={id || "anonymous"} className="contents">{children}</div>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus><AccountBoundary>{children}</AccountBoundary></SessionProvider>;
}
