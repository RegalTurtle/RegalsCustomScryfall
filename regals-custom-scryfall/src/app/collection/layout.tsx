import { requirePageUser } from "@/server/auth";

export default async function PrivateCollection({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return children;
}
