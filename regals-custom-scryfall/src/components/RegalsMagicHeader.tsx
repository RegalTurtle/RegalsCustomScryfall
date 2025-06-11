"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default (
  { isHome }: 
  { isHome: boolean }
) => {
  const { data: session } = useSession();

  return (
    <header className="h-20 flex items-center relative mb-5 bg-teal-950">
      {!isHome && <Link href="/" className="mr-auto mv-auto ml-5 bg-indigo-600 p-2 text-white rounded-md hover:bg-indigo-700">Home</Link>}
      <h1 className="absolute left-1/2 transform -translate-x-1/2 text-3xl">Regal's Magic</h1>
      {!session && <Link href="/login" className="ml-auto mv-auto mr-5 bg-indigo-600 p-2 text-white rounded-md hover:bg-indigo-700">Log In</Link>}
      {session && <button onClick={() => signOut()} className="ml-auto mv-auto mr-5 bg-indigo-600 p-2 text-white rounded-md hover:bg-indigo-700">Log Out</button>}
    </header>
  )
}