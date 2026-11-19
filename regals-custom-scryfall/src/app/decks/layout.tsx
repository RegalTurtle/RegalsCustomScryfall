import { requirePageUser } from "@/server/auth";

export default async function PrivateDecks({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return children;
}
