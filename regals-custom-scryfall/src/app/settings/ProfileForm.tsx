"use client";

import { useActionState, useState } from "react";
import { saveProfile } from "./actions";

const inputClass = "mt-1 block w-full rounded-md border border-teal-700 bg-teal-950 px-3 py-2 text-white";

export default function ProfileForm({ username, email }: { username: string; email: string }) {
  const [details, setDetails] = useState({ username, email });
  const [result, submit, pending] = useActionState<{ message?: string; error?: string }, FormData>(async (_previous, formData) => {
    const result = await saveProfile(formData);
    if (!result.profile) return { error: result.error };

    setDetails({ username: result.profile.username, email: result.profile.email });
    return { message: "Account saved." };
  }, {});

  return (
    <form action={submit} className="mt-4">
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <label>
          Username
          <input className={inputClass} name="username" autoComplete="username" required value={details.username} onChange={(event) => setDetails({ ...details, username: event.target.value })} />
        </label>
        <label>
          Email (optional)
          <input className={inputClass} name="email" type="email" autoComplete="email" value={details.email} onChange={(event) => setDetails({ ...details, email: event.target.value })} />
        </label>
        <label>
          New password (optional)
          <input className={inputClass} name="newPassword" type="password" autoComplete="new-password" minLength={12} aria-describedby="new-password-help" />
          <span id="new-password-help" className="mt-1 block text-sm text-teal-100">Use at least 12 characters with a number, a special character, and an uppercase letter. No spaces.</span>
        </label>
        <label>
          Confirm new password
          <input className={inputClass} name="confirmPassword" type="password" autoComplete="new-password" />
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:col-span-2">
          <label>
            Current password
            <input className={inputClass} name="currentPassword" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className="whitespace-nowrap rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60">
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </fieldset>
      {result.error && <p role="alert" className="mt-3 text-red-200">{result.error}</p>}
      {result.message && <p role="status" className="mt-3 text-teal-100">{result.message}</p>}
    </form>
  );
}
