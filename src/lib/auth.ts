import { compare } from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { credentialsSchema } from "@/lib/validations/auth";

/**
 * NextAuth Credentials config.
 *
 * Role is loaded from PostgreSQL during login, then copied onto the JWT.
 * Clients cannot change their role by sending a different value in the
 * login form or in cookies they edit themselves — those values are not
 * read for authorization.
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }
        if (!rateLimit(`login:${parsed.data.email}`, 10, 15 * 60_000)) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || user.deactivatedAt) {
          return null;
        }

        const passwordMatches = await compare(parsed.data.password, user.password);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email ?? "",
        role: token.role,
      };
      return session;
    },
  },
};
