"/* eslint-disable @typescript-eslint/no-explicit-any */"

import NextAuth, { NextAuthOptions, Account } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

type GoogleProfile = {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

const upsertUserFromGoogle = async (profile: GoogleProfile, account: Account | null | undefined) => {
  const providerAccountId = account?.providerAccountId || profile?.sub || profile?.id || null;
  const email = profile?.email || null;
  const name = profile?.name || profile?.given_name || profile?.family_name || null;
  const image = profile?.picture || null;

  if (!providerAccountId && !email) {
    throw new Error("Missing providerAccountId and email");
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        providerAccountId ? { providerAccountId } : undefined,
        email ? { email } : undefined,
      ].filter(Boolean) as any,
    },
  });

  if (existing) {
    if (
      existing.name !== name ||
      existing.image !== image ||
      existing.email !== email ||
      existing.providerAccountId !== providerAccountId
    ) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name ?? existing.name,
          image: image ?? existing.image,
          email: email ?? existing.email,
          providerAccountId: providerAccountId ?? existing.providerAccountId,
        },
      });
    }
    return existing.id;
  }

  const created = await prisma.user.create({
    data: {
      email,
      providerAccountId,
      name,
      image,
    },
  });
  return created.id;
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const userId = await upsertUserFromGoogle(profile as GoogleProfile, account);
        token.userId = userId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
