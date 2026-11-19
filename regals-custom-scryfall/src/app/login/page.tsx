"use client";

import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import RegalsMagicHeader from "@/components/RegalsMagicHeader";

const inputClass = "mt-1 block w-full rounded-md border border-teal-700 bg-teal-950 px-3 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const searchParams = useSearchParams();
  const [error, setError] = useState(searchParams.get("error"));
  const [pending, setPending] = useState(false);

  const errorMessage = error === "CredentialsSignin"
    ? "Invalid username or password."
    : "An unexpected error occurred. Please try again.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.ok && !result.error) {
        window.location.assign("/");
        return;
      }
      setError(result?.error || "SignInFailed");
    } catch {
      setError("SignInFailed");
    }
    setPending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        Username
        <input className={inputClass} name="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label className="block">
        Password
        <input className={inputClass} name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <div>
        <button type="submit" disabled={pending} className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200 disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in"}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-200">{errorMessage}</p>
        )}
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-teal-900 text-white">
      <RegalsMagicHeader showBack backUrl="/" backText="Home" hideLoginLink />
      <main className="grid flex-1 place-items-center px-4 pb-10">
        <section aria-labelledby="login-heading" className="w-full max-w-sm rounded-lg border border-teal-700 bg-teal-950/50 p-4 sm:p-6">
          <h2 id="login-heading" className="mb-5 text-2xl font-semibold">Sign in</h2>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
