import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import userData, { InvalidCredentialsError } from "@/data/users";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        try {
          const user = await userData.verifyUser(credentials.username, credentials.password);
          return {
            id: user.id,
            permissionLevel: user.permissionLevel,
          };
        } catch (error) {
          if (error instanceof InvalidCredentialsError) return null;
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.permissionLevel = user.permissionLevel;
      }
      delete token.username;
      return token;
    },
    async session({ session, token }) {
      // Old username-based tokens deliberately do not acquire an ID.
      session.user.id = typeof token.userId === "string" ? token.userId : "";
      if (token.permissionLevel) {
        session.user.permissionLevel = token.permissionLevel;
      }
      return session;
    },
  },
};
