import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Replace with database-backed users before production
const TEST_USER = {
  id: "1",
  email: "admin@voiceplatform.com",
  password: "changeme123",
  name: "Admin",
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.email === TEST_USER.email &&
          credentials?.password === TEST_USER.password
        ) {
          return { id: TEST_USER.id, email: TEST_USER.email, name: TEST_USER.name };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
