import { requirePageUser } from "@/server/auth";

export default async function PrivateGames({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return children;
}
