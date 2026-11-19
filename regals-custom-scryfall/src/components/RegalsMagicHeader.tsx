"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

type HeaderProps = {
  showBack: boolean;
  backUrl: string;
  backText: string;
}

export default (
  { showBack, backUrl, backText }: 
  HeaderProps
) => {
  const { data: session } = useSession();

  const buttonClass = "rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700";

  return (
    <header className="mb-5 grid grid-cols-[1fr_auto] items-center gap-2 bg-teal-950 px-3 py-2 sm:min-h-20 sm:grid-cols-[1fr_auto_1fr] sm:px-5">
      <div className="row-start-2 sm:row-start-1">
        {showBack && <Link href={backUrl} className={`inline-block ${buttonClass}`}>{backText}</Link>}
      </div>
      <h1 className="col-span-2 row-start-1 text-center text-2xl sm:col-span-1 sm:col-start-2 sm:text-3xl">Regal's Magic</h1>
      <div className="col-start-2 row-start-2 flex flex-wrap justify-end gap-2 sm:col-start-3 sm:row-start-1">
        {session?.user.id ? (
          <Link href="/settings" className={buttonClass}>Settings</Link>
        ) : (
          <Link href="/login" className={buttonClass}>Log In</Link>
        )}
      </div>
    </header>
  );
}
