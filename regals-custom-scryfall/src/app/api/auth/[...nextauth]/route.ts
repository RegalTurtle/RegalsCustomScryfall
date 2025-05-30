import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import userData from "@/data/users";
import validation from "@/validation";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          let { username, password } = credentials ?? {};

          // Validate input
          username = validation.verifyUsername(username);
          password = validation.verifyPassword(password);

          // Check user from data source (e.g., MongoDB)
          const user = await userData.verifyUser(username, password);

          // Return user object to be saved in JWT/session
          if (user) {
            return {
              id: user.username,
              name: `${user.firstName} ${user.lastName}`,
              username: user.username,
            };
          }

          return null; // Invalid credentials
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };