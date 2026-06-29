import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import userData from "@/data/users";
import validation from "@/validation";

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
        let { username, password } = credentials;

        username = validation.verifyUsername(username);
        password = validation.verifyPassword(password);

        const user = await userData.verifyUser(username, password);
        if (!user) return null;

        return {
          id: user.username,
          username: user.username,
          permissionLevel: user.permissionLevel,
        };
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
        token.username = user.username;
        token.permissionLevel = user.permissionLevel;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.username) {
        session.user.username = token.username;
      }
      if (token.permissionLevel) {
        session.user.permissionLevel = token.permissionLevel;
      }
      return session;
    },
  },
};
