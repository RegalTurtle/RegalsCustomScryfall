import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth-options";
import { redirect } from "next/navigation";

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
