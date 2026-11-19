import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth-options";
import { redirect } from "next/navigation";
import authorization from "@/authorization";
import { users } from "@/config/mongoCollections";

export async function authenticatedUserId(): Promise<ObjectId | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : null;
}

export async function requirePageUser() {
  const id = await authenticatedUserId();
  if (!id) redirect("/login");
  return id;
}

export async function authenticatedOwnerId(): Promise<ObjectId | null> {
  const id = await authenticatedUserId();
  if (!id) return null;
  const account = await (await users()).findOne({ _id: id }, { projection: { permissionLevel: 1 } });
  return authorization.canManageAccounts(account?.permissionLevel) ? id : null;
}
