// types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    permissionLevel: string;
  }

  interface Session {
    user: {
      id: string;
      permissionLevel: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    permissionLevel?: string;
  }
}
