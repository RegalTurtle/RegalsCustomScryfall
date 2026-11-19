"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
    >
      Log Out
    </button>
  );
}
