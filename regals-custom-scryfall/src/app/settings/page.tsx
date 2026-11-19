import RegalsMagicHeader from "@/components/RegalsMagicHeader";
import authorization from "@/authorization";
import { users } from "@/config/mongoCollections";
import userData from "@/data/users";
import { requirePageUser } from "@/server/auth";
import AccountPanel from "./AccountPanel";
import LogoutButton from "./LogoutButton";
import ProfileForm from "./ProfileForm";

export default async function SettingsPage() {
  const id = await requirePageUser();
  const account = await (await users()).findOne({ _id: id }, { projection: { username: 1, email: 1, permissionLevel: 1 } });
  const accounts = authorization.canManageAccounts(account?.permissionLevel)
    ? await userData.listAccounts(id)
    : null;

  return (
    <div className="min-h-screen bg-teal-900 text-white">
      <RegalsMagicHeader showBack backUrl="/" backText="Home" />
      <main className="mx-auto max-w-2xl px-4 pb-10">
        <h2 className="mb-5 text-2xl font-semibold">Settings</h2>
        <section aria-labelledby="account-heading" className="rounded-lg border border-teal-700 bg-teal-950/50 p-4 sm:p-6">
          <h3 id="account-heading" className="text-lg font-semibold">Account</h3>
          {account?.username && (
            <ProfileForm username={account.username} email={account.email ?? ""} />
          )}
        </section>
        <div className="mt-5">
          <LogoutButton />
        </div>
        {accounts && (
          <section id="manage-accounts" aria-labelledby="manage-accounts-heading" className="mt-8">
            <h3 id="manage-accounts-heading" className="mb-3 text-xl font-semibold">Manage accounts</h3>
            <AccountPanel accounts={accounts} />
          </section>
        )}
      </main>
    </div>
  );
}
