"use client";

import { useActionState, useState } from "react";
import authorization from "@/authorization";
import type { AccountDetails, ManagedAccount } from "@/types/user";
import { saveAccount } from "./actions";

const emptyAccount: AccountDetails = {
  username: "",
  email: "",
  permissionLevel: "user",
};

const permissionLabels: Record<string, string> = {
  owner: "Owner",
  user: "User",
  "collection-recorder": "Collection recorder",
};

const fields = [
  { name: "username", label: "Username", type: "text", autoComplete: "username" },
  { name: "email", label: "Email (optional)", type: "email", autoComplete: "email" },
] as const;

const inputClass = "mt-1 block w-full rounded-md border border-teal-700 bg-teal-950 px-3 py-2 text-white";

function AccountForm({ account }: { account?: ManagedAccount }) {
  const [details, setDetails] = useState<AccountDetails>(account ?? emptyAccount);
  const [result, submit, pending] = useActionState<{ message?: string; error?: string }, FormData>(async (_previous, formData) => {
    const result = await saveAccount(account?.id ?? "", formData);
    if (result.message && !account) setDetails(emptyAccount);
    return result;
  }, {});

  return (
    <form action={submit}>
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-semibold">{account ? "Edit account" : "New account"}</legend>
        {fields.map(({ name, label, type, autoComplete }) => (
          <label key={name}>
            {label}
            <input
              className={inputClass}
              name={name}
              type={type}
              autoComplete={autoComplete}
              required={name === "username"}
              value={details[name] ?? ""}
              onChange={(event) => setDetails({ ...details, [name]: event.target.value })}
            />
          </label>
        ))}
        <label>
          Permission level
          <select
            className={inputClass}
            name="permissionLevel"
            required
            value={details.permissionLevel}
            onChange={(event) => setDetails({ ...details, permissionLevel: event.target.value })}
          >
            {!authorization.permissionLevels.includes(details.permissionLevel) && <option value={details.permissionLevel}>Select a permission level</option>}
            {authorization.permissionLevels.map((level) => <option key={level} value={level}>{permissionLabels[level]}</option>)}
          </select>
        </label>
        <label>
          {account ? "New password (optional)" : "Password"}
          <input className={inputClass} name="password" type="password" autoComplete="new-password" required={!account} aria-describedby="account-password-help" />
          <span id="account-password-help" className="mt-1 block text-sm text-teal-100">
            {account && "Leave blank to keep the current password. "}
            Use at least 12 characters, including a number, a special character, and an uppercase letter. No spaces.
          </span>
        </label>
        <button type="submit" className="w-fit rounded-md bg-indigo-600 px-4 py-2 hover:bg-indigo-700 disabled:opacity-60">
          {pending ? "Saving…" : account ? "Save changes" : "Create account"}
        </button>
      </fieldset>
      {result.error && <p role="alert" className="mt-4 text-red-200">{result.error}</p>}
      {result.message && <p role="status" className="mt-4 text-teal-100">{result.message}</p>}
    </form>
  );
}

export default function AccountPanel({ accounts }: { accounts: ManagedAccount[] }) {
  const [accountId, setAccountId] = useState("");
  const account = accounts.find(({ id }) => id === accountId);

  return (
    <div className="space-y-5 rounded-lg border border-teal-700 bg-teal-950/50 p-4 sm:p-6">
      <label className="block">
        Account
        <select className={inputClass} value={account?.id ?? ""} onChange={(event) => setAccountId(event.target.value)}>
          <option value="">Create a new account</option>
          {accounts.map(({ id, username }) => <option key={id} value={id}>{username || "Account without a username"}</option>)}
        </select>
      </label>
      <AccountForm key={account?.id ?? "new"} account={account} />
    </div>
  );
}
