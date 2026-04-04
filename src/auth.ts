import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureUserFromOAuth } from "@/lib/auth/oauth-user";

const googleEnabled =
  Boolean(process.env.AUTH_GOOGLE_ID) &&
  Boolean(process.env.AUTH_GOOGLE_SECRET);
const githubEnabled =
  Boolean(process.env.AUTH_GITHUB_ID) &&
  Boolean(process.env.AUTH_GITHUB_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(githubEnabled
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID!,
            clientSecret: process.env.AUTH_GITHUB_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password || typeof email !== "string") {
          return null;
        }
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase().trim()))
          .limit(1);
        if (!user?.passwordHash) {
          return null;
        }
        const ok = await bcrypt.compare(String(password), user.passwordHash);
        if (!ok) {
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "github") {
        if (!user.email) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        if (
          account?.provider === "google" ||
          account?.provider === "github"
        ) {
          const email = user.email;
          if (!email) {
            return token;
          }
          const dbUser = await ensureUserFromOAuth(
            email,
            user.name,
            user.image,
          );
          token.sub = dbUser.id;
        } else {
          token.sub = user.id;
        }
        token.triggerSpotifySync = true;
      }
      if (
        trigger === "update" &&
        session &&
        typeof session === "object" &&
        "clearSpotifySyncTrigger" in session &&
        (session as { clearSpotifySyncTrigger?: boolean }).clearSpotifySyncTrigger
      ) {
        token.triggerSpotifySync = false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      session.triggerSpotifySync = Boolean(token.triggerSpotifySync);
      return session;
    },
  },
});
