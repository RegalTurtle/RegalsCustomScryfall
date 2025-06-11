// types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    username: string;
    permissionLevel: string;
  }

  interface Session {
    user: {
      username: string;
      permissionLevel: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    permissionLevel?: string;
  }
}